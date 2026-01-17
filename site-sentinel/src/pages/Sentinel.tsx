import { useState, useEffect, useRef, ChangeEvent, useCallback } from "react";
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
import { Calendar as CalendarIcon, Plus, Edit, Trash2, ExternalLink, CheckCircle2, XCircle, LayoutDashboard, Globe, FileText, Download, AlertTriangle, ChevronDown, RefreshCw, Loader2, ArrowUp, ArrowDown, Info, Eye, Wrench, LogOut, Search, Sun, Moon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
// Import jsPDF and autoTable
import { jsPDF } from 'jspdf';
import autoTable, { CellDef } from 'jspdf-autotable';
import 'jspdf-autotable';
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

import { useWebsites, type Website } from "@/hooks/useWebsites";
import { useDailyChecks, type DailyCheck } from "@/hooks/useDailyChecks";
import { useAutoChecks, type AutoCheck } from "@/hooks/useAutoChecks";
import { ReportPatcher } from "@/components/ReportPatcher";

const Sentinel = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    const syncUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate("/", { replace: true });
        return;
      }
      setCurrentUser({ email: data.user.email || "User" });
    };

    syncUser();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        navigate("/", { replace: true });
        return;
      }
      setCurrentUser({ email: session.user.email || "User" });
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [navigate]);

  const { 
    websites, 
    isLoading: websitesLoading, 
    addWebsite: addWebsiteDB, 
    updateWebsite: updateWebsiteDB, 
    deleteWebsite: deleteWebsiteDB, 
    bulkAddWebsites,
    clearAllWebsites: clearAllWebsitesDB 
  } = useWebsites();

  const { 
    dailyChecks, 
    isLoading: checksLoading, 
    addDailyCheck: addDailyCheckDB, 
    getChecksByDate,
    clearAllChecks: clearAllChecksDB 
  } = useDailyChecks();

  const [isChecking, setIsChecking] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentCheckIndex, setCurrentCheckIndex] = useState(0);
  const [checkComplete, setCheckComplete] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const storedTheme = localStorage.getItem("sentinel-theme");
    const nextTheme = storedTheme ? storedTheme === "dark" : true;
    setIsDarkMode(nextTheme);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    localStorage.setItem("sentinel-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);
  
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
  const [autoFilter, setAutoFilter] = useState("all");
  const [autoSearchQuery, setAutoSearchQuery] = useState("");
  const [isAutoSearchOpen, setIsAutoSearchOpen] = useState(false);

  const { autoChecks, isLoading: autoChecksLoading, runAutoChecksNow, fetchAutoChecks } = useAutoChecks();
  const autoLastRun = autoChecks[0]?.checked_at;
  const normalizedAutoSearchQuery = autoSearchQuery.trim().toLowerCase();
  const autoSearchMatches = (check: AutoCheck) => {
    if (!normalizedAutoSearchQuery) return true;
    const statusCodeText = check.status_code === null ? "" : String(check.status_code);
    return (
      check.website_name?.toLowerCase().includes(normalizedAutoSearchQuery) ||
      check.website_url?.toLowerCase().includes(normalizedAutoSearchQuery) ||
      check.error_type?.toLowerCase().includes(normalizedAutoSearchQuery) ||
      statusCodeText.includes(normalizedAutoSearchQuery)
    );
  };
  const autoChecksBySearch = autoChecks.filter(autoSearchMatches);
  const filteredAutoChecks =
    autoFilter === "all"
      ? autoChecksBySearch
      : autoFilter === "not-live"
        ? autoChecksBySearch.filter(check => !check.is_live)
        : autoChecksBySearch.filter(check => check.error_type === autoFilter);
  const autoIssues = autoChecks.filter(check => !check.is_live);
  const autoLiveCount = autoChecks.filter(check => check.is_live).length;
  const autoErrorCounts = autoChecks.reduce<Record<string, number>>((acc, check) => {
    if (!check.is_live) {
      acc[check.error_type] = (acc[check.error_type] || 0) + 1;
    }
    return acc;
  }, {});
  
  // Combined loading state for UI display
  const [isLoading, setIsLoading] = useState({
    dashboard: true // Initial load
  });
  
  // Simulate trend data (in a real app, this would come from your backend)
  const [trendData, setTrendData] = useState({
    total: { change: 2, isPositive: true },
    live: { change: 1, isPositive: true },
    functional: { change: 1, isPositive: false },
    problematic: { change: 2, isPositive: false }
  });
  
  // Simulate loading data for dashboard
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
    "This site can not be reached",
    "This page isn not working",
    "Redirecting to Betting Site",
    "Domain Expired",
    "403 Page",
    "Other (Specify Below)"
  ];
  const [reportData, setReportData] = useState<DailyCheck[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  const parseCSV = (raw: string): string[][] => {
    // Minimal CSV parser with quoted field support.
    const text = raw.replace(/^\uFEFF/, '');
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (inQuotes) {
        if (char === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += char;
        }
        continue;
      }

      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        field = '';
        if (row.some(cell => cell.trim() !== '')) {
          rows.push(row);
        }
        row = [];
      } else {
        field += char;
      }
    }

    if (field.length > 0 || row.length > 0) {
      row.push(field);
      if (row.some(cell => cell.trim() !== '')) {
        rows.push(row);
      }
    }

    return rows;
  };

  const handleCSVImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      if (rows.length < 2) {
        throw new Error('CSV file is empty or has no data rows');
      }

      const headers = rows[0].map(h => h.trim().toLowerCase());
      
      if (!headers.includes('name') || !headers.includes('url')) {
        throw new Error('CSV must include "name" and "url" columns');
      }

      // Prepare objects for bulk import
      const websitesToImport: Partial<Website>[] = [];
      const existingUrls = new Set(websites.map(w => w.url.toLowerCase()));
      const newUrls = new Set<string>();
      const duplicateUrls = new Set<string>();

      for (let i = 1; i < rows.length; i++) {
        const values = rows[i].map(v => v.trim());
        const website: Partial<Website> = {};
        
        headers.forEach((header, index) => {
          if (header === 'name') website.name = values[index] || `Website ${i}`;
          if (header === 'url') {
            let url = values[index];
            if (!url.match(/^https?:\/\//i)) {
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
            websitesToImport.push({
              name: website.name,
              url: website.url,
            });
            newUrls.add(url);
          }
        }
      }

      if (websitesToImport.length > 0) {
        // Use the hook for bulk add
        await bulkAddWebsites(websitesToImport as any); 
        
        let message = `Successfully imported ${websitesToImport.length} website(s)`;
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

  const addWebsite = async () => {
    if (!websiteName || !websiteUrl) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    
    try {
      if (editingId) {
        // FIX: Pass arguments individually (id, name, url)
        await updateWebsiteDB(editingId, websiteName, websiteUrl);
        toast({ title: "Success", description: "Website updated successfully" });
        setEditingId(null);
      } else {
        // FIX: Pass arguments individually (name, url)
        await addWebsiteDB(websiteName, websiteUrl);
        toast({ title: "Success", description: "Website added successfully" });
      }
      setWebsiteName("");
      setWebsiteUrl("");
    } catch (error) {
      console.error("Error saving website:", error);
      toast({ title: "Error", description: "Failed to save website", variant: "destructive" });
    }
  };

  const stopDailyChecks = () => {
    setIsStopping(true);
    setIsChecking(false);
    setIsPaused(false);
    setCheckComplete(false);
    setCurrentCheckIndex(0);
    setIsStopping(false);
    toast({ title: "Stopped", description: "Website checks have been stopped" });
  };

  const pauseDailyChecks = () => {
    const newPausedState = !isPaused;
    
    if (newPausedState) {
      // When pausing, save the current state
      const stateToSave = {
        index: currentCheckIndex,
        isLive,
        isFunctional,
        hasProblem,
        selectedIssue,
        notes,
        isCustomNote,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('pausedCheck', JSON.stringify(stateToSave));
      
      // Set a flag in session storage to indicate we're in a paused state
      sessionStorage.setItem('isPaused', 'true');
      
      // When pausing, we should also set isChecking to false to allow navigation
      setIsChecking(false);
      
      toast({
        title: "Paused",
        description: "Checks are paused. You can leave this page and come back later."
      });
    } else {
      // When resuming, clear the saved state
      localStorage.removeItem('pausedCheck');
      sessionStorage.removeItem('isPaused');
      
      // When resuming, set isChecking back to true
      setIsChecking(true);
      
      toast({
        title: "Resumed",
        description: "Resuming website checks"
      });
    }
    
    setIsPaused(newPausedState);
  };

  const checkPausedState = useCallback(() => {
    const savedState = localStorage.getItem('pausedCheck');
    const isCurrentlyPaused = sessionStorage.getItem('isPaused') === 'true';
    
    if (savedState && isCurrentlyPaused) {
      try {
        const state = JSON.parse(savedState);
        const savedTime = new Date(state.timestamp);
        const hoursDiff = (new Date().getTime() - savedTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          setIsPaused(true);
          setCurrentCheckIndex(state.index);
          setIsLive(state.isLive);
          setIsFunctional(state.isFunctional);
          setHasProblem(state.hasProblem);
          setSelectedIssue(state.selectedIssue);
          setNotes(state.notes);
          setIsCustomNote(state.isCustomNote);
          
          if (!isChecking) {
            toast({
              title: "Paused Check Found",
              description: "Found a paused check. Click Resume to continue where you left off."
            });
          }
          return true;
        }
      } catch (e) {
        console.error("Error restoring paused state:", e);
      }
    }
    
    if (!isCurrentlyPaused && savedState) {
      localStorage.removeItem('pausedCheck');
    }
    
    return false;
  }, [isChecking]);

  useEffect(() => {
    const handleFocus = () => {
      if (sessionStorage.getItem('isPaused') === 'true') {
        checkPausedState();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkPausedState]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only prevent navigation if there's an active check AND it's not paused
      if (isChecking && !isPaused) {
        const message = "You have an active check in progress. Are you sure you want to leave?";
        e.preventDefault();
        e.returnValue = message; // For Chrome
        return message; // For other browsers
      }
      // If checks are paused or not running, allow navigation without prompt
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isChecking, isPaused]);

  const startNewCheck = useCallback(() => {
    setCurrentCheckIndex(0);
    setIsChecking(true);
    setIsPaused(false);
    setIsLive("yes");
    setIsFunctional("yes");
    setHasProblem("no");
    setSelectedIssue("");
    setNotes("");
    setIsCustomNote(true);
  }, []);

  const startDailyCheck = useCallback(() => {
    // Check if websites are still loading
    if (websitesLoading) {
      toast({
        title: "Loading...",
        description: "Please wait while we load your websites",
      });
      return;
    }

    // Check if there are any websites
    if (websites.length === 0) {
      toast({ 
        title: "No Websites Found", 
        description: "Please add websites before starting checks", 
        variant: "destructive" 
      });
      return;
    }

    // Reset states
    setIsCustomNote(false);
    setIsStopping(false);
    setReportData([]);

    // Check for paused state
    const hasPausedState = checkPausedState();
    
    if (hasPausedState) {
      setIsChecking(true);
    } else {
      startNewCheck();
    }
  }, [websites, websitesLoading, checkPausedState, startNewCheck]);

  const handleNext = async () => {
    if (isPaused) {
      setIsPaused(false);
      toast({ title: "Resumed", description: "Resuming website checks" });
      return;
    }
    
    const currentWebsite = websites[currentCheckIndex];
    const finalNotes = selectedIssue === "Other (Specify Below)" 
      ? notes 
      : selectedIssue || notes;
    
    try {
      // Use the hook to add the check
      await addDailyCheckDB({
        website_id: currentWebsite.id,
        website_name: currentWebsite.name,
        website_url: currentWebsite.url,
        is_live: isLive === "yes",
        is_functional: isFunctional === "yes",
        has_problem: hasProblem === "yes",
        notes: finalNotes,
        created_at: new Date().toISOString(),
      } as any);

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
    } catch (error) {
      console.error("Error saving check:", error);
      toast({ title: "Error", description: "Failed to save check result", variant: "destructive" });
    }
  };

  const generateReport = () => {
    if (!reportDate) {
      toast({ title: "Error", description: "Please select a date", variant: "destructive" });
      return;
    }
    const selectedDate = format(reportDate, "yyyy-MM-dd");
    
    // Filter local data
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

  const clearAllWebsites = async () => {
    try {
      await clearAllWebsitesDB();
      setIsClearWebsitesDialogOpen(false);
      toast({
        title: "Success",
        description: "All websites have been cleared.",
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to clear websites", variant: "destructive" });
    }
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
      doc.setFont("courier", "bold");
      doc.setFontSize(22);
      doc.text(
        filenamePrefix.includes('problematic') ? 'Problematic Websites Report' : 'Sentinel Report',
        14,
        20
      );
      
      // Add date
      doc.setFont("courier");
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

      // Prepare table data as a 2D array of CellDef for autoTable
      const tableData: CellDef[][] = checks.map(check => [
        // Website
        {
          content: `${check.website_name}\n${check.website_url}`,
          styles: { 
            halign: 'left',
            fontStyle: 'normal' as const
          }
        },
        // Live
        {
          content: check.is_live ? 'Yes' : 'No',
          styles: { 
            halign: 'center',
            fontStyle: 'normal' as const,
            textColor: check.is_live ? [0, 150, 0] as [number, number, number] : [200, 0, 0] as [number, number, number]
          }
        },
        // Functional
        {
          content: check.is_functional ? 'Yes' : 'No',
          styles: { 
            halign: 'center',
            fontStyle: 'normal' as const,
            textColor: check.is_functional ? [0, 150, 0] as [number, number, number] : [200, 0, 0] as [number, number, number]
          }
        },
        // Issue
        {
          content: check.has_problem ? 'Yes' : 'No',
          styles: { 
            halign: 'center',
            fontStyle: 'normal' as const,
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
          fontSize: 13,
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
          // fontStyle: 'bold',
          fontSize: 13,
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

  const clearAllReports = async () => {
    try {
      await clearAllChecksDB();
      setReportData([]);
      setShowClearConfirm(false);
      toast({ title: "Success", description: "All reports have been cleared" });
    } catch (error) {
      console.error('Error clearing reports:', error);
      toast({ 
        title: "Error", 
        description: "Failed to clear reports", 
        variant: "destructive" 
      });
    }
  };

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "auto-checks", label: "Automated Checks", icon: RefreshCw },
    { id: "websites", label: "Websites", icon: Globe },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "report-patcher", label: "Report Patcher", icon: Wrench },
  ];

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 bg-sidebar-background border-r border-sidebar-border flex flex-col sticky top-0 h-screen dark:backdrop-blur-2xl dark:border-white/10">
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
                    activeTab === item.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground dark:border dark:border-white/10"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 dark:border dark:border-transparent"
                  } ${isChecking ? "opacity-50 cursor-not-allowed" : ""} dark:backdrop-blur-lg`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground"
            onClick={() => setIsDarkMode((prev) => !prev)}
          >
            {isDarkMode ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
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
                      {isLoading.dashboard || websitesLoading ? (
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
                      {isLoading.dashboard || checksLoading ? (
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
                      {isLoading.dashboard || checksLoading ? (
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
                      {isLoading.dashboard || checksLoading ? (
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
                            <Button onClick={addWebsite} disabled={websitesLoading}>
                              {websitesLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              <Plus className="w-4 h-4 mr-2" />
                              {editingId ? "Update" : "Add"} Website
                            </Button>
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
                                disabled={websitesLoading}
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
                      disabled={websites.length === 0 || websitesLoading}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear All
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {websitesLoading ? (
                         <div className="py-8 flex justify-center">
                           <Loader2 className="h-8 w-8 animate-spin text-primary" />
                         </div>
                      ) : (
                        <>
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
                                    onClick={async () => { 
                                      try {
                                        await deleteWebsiteDB(website.id); 
                                        toast({ title: "Success", description: "Website deleted" }); 
                                      } catch (e) {
                                        toast({ title: "Error", description: "Failed to delete website", variant: "destructive" });
                                      }
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
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "report-patcher" && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-foreground">Report Patcher</h2>
                <ReportPatcher currentUser={currentUser?.email || 'System'} />
              </div>
            )}

            {activeTab === "auto-checks" && (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-foreground">Automated Checks</h2>
                    <p className="text-muted-foreground">
                      Scheduled website health checks with instant visibility on issues.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={runAutoChecksNow} disabled={autoChecksLoading}>
                      {autoChecksLoading ? "Running..." : "Run Check Now"}
                    </Button>
                    <Button variant="secondary" onClick={fetchAutoChecks} disabled={autoChecksLoading}>
                      Refresh
                    </Button>
                    <Button variant="secondary" disabled>
                      Schedule: Daily at 8:00 AM
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Card>
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-[18px] font-semibold leading-snug text-foreground">
                        Total Sites Checked
                      </CardTitle>
                      <CardDescription className="text-xs leading-relaxed">
                        {autoLastRun ? `Last run: ${format(new Date(autoLastRun), "PPpp")}` : "Latest automated run"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{autoChecks.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-[18px] font-semibold leading-snug text-foreground">
                        Live
                      </CardTitle>
                      <CardDescription className="text-xs leading-relaxed">Sites responding normally</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-500">{autoLiveCount}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-[18px] font-semibold leading-snug text-foreground">
                        Issues
                      </CardTitle>
                      <CardDescription className="text-xs leading-relaxed">Sites needing attention</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-amber-500">{autoIssues.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-[18px] font-semibold leading-snug text-foreground">
                        Errors Detected
                      </CardTitle>
                      <CardDescription className="text-xs leading-relaxed">By status class</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        500s: {autoErrorCounts["500"] || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        403s: {autoErrorCounts["403"] || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Timeouts: {autoErrorCounts["timeout"] || 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle className="text-[18px] font-semibold leading-snug text-foreground">
                        Issues
                      </CardTitle>
                      <CardDescription>Only websites with problems</CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant={isAutoSearchOpen ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setIsAutoSearchOpen((open) => {
                            if (open) {
                              setAutoSearchQuery("");
                            }
                            return !open;
                          })
                        }
                        aria-label="Search automated checks"
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                      {isAutoSearchOpen && (
                        <Input
                          value={autoSearchQuery}
                          onChange={(event) => setAutoSearchQuery(event.target.value)}
                          placeholder="Search website or error..."
                          className="h-9 w-56"
                        />
                      )}
                      {[
                        { id: "all", label: "All" },
                        { id: "not-live", label: "Not Live" },
                        { id: "500", label: "500" },
                        { id: "403", label: "403" },
                        { id: "timeout", label: "Timeout" },
                        { id: "dns", label: "DNS" },
                      ].map((filter) => (
                        <Button
                          key={filter.id}
                          variant={autoFilter === filter.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setAutoFilter(filter.id)}
                        >
                          {filter.label}
                        </Button>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {autoChecksLoading ? (
                      <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
                        Loading automated checks...
                      </div>
                    ) : filteredAutoChecks.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
                        No automated issues yet. Once checks run, problem sites will appear here.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="bg-muted/50 text-left">
                              <th className="border p-2">Website</th>
                              <th className="border p-2">Status</th>
                              <th className="border p-2">Error Type</th>
                              <th className="border p-2">Response</th>
                              <th className="border p-2">Last Checked</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredAutoChecks.map((check) => (
                              <tr key={check.id} className="border-b">
                                <td className="border p-2">
                                  <div className="font-medium">{check.website_name}</div>
                                  <div className="text-xs text-muted-foreground">{check.website_url}</div>
                                </td>
                                <td className="border p-2">
                                  {check.status_code ?? "N/A"}
                                </td>
                                <td className="border p-2">{check.error_type}</td>
                                <td className="border p-2">
                                  {check.response_time_ms ? `${check.response_time_ms}ms` : "-"}
                                </td>
                                <td className="border p-2">
                                  {format(new Date(check.checked_at), "PPpp")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-[18px] font-semibold leading-snug text-foreground">
                      Recent Automated Runs
                    </CardTitle>
                    <CardDescription>Latest checks, including successful ones</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {autoChecksLoading ? (
                      <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
                        Loading automated checks...
                      </div>
                    ) : autoChecks.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
                        Automated checks will show up here once the scheduler runs.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {autoChecks.slice(0, 10).map((check) => (
                          <div key={check.id} className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <div className="font-medium">{check.website_name}</div>
                              <div className="text-xs text-muted-foreground">{check.website_url}</div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {check.status_code ?? "N/A"} • {check.response_time_ms ? `${check.response_time_ms}ms` : "-"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "reports" && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-foreground">Reports</h2>
                
                {/* Recent Reports Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Reports</CardTitle>
                    <CardDescription>Your most recent website check reports</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dailyChecks.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No reports available. Generate your first report to see it here.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Array.from(new Set(dailyChecks.map(check => check.created_at.split('T')[0])))
                          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
                          .slice(0, 5)
                          .map((date, index) => {
                            const dateChecks = dailyChecks.filter(
                              check => check.created_at.startsWith(date)
                            );
                            const totalChecks = dateChecks.length;
                            const liveCount = dateChecks.filter(c => c.is_live).length;
                            const issuesCount = dateChecks.filter(c => c.has_problem).length;
                            
                            return (
                              <div key={date} className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                  <h3 className="font-medium">
                                    {format(new Date(date), 'MMMM d, yyyy')}
                                  </h3>
                                  <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                                    <span className="flex items-center">
                                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-500" />
                                      {liveCount}/{totalChecks} Live
                                    </span>
                                    {issuesCount > 0 && (
                                      <span className="flex items-center text-amber-500">
                                        <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                                        {issuesCount} Issues
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setReportDate(new Date(date));
                                      setReportData(dateChecks);
                                      // Scroll to report section
                                      setTimeout(() => {
                                        const reportSection = document.getElementById('generated-report');
                                        if (reportSection) {
                                          reportSection.scrollIntoView({ behavior: 'smooth' });
                                        }
                                      }, 100);
                                    }}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      generateAndDownloadPDF(dateChecks, `report-${date}-`);
                                    }}
                                  >
                                    <Download className="w-4 h-4 mr-1" />
                                    Download
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Generate New Report Section */}
                <Card id="generate-report">
                  <CardHeader>
                    <CardTitle>Generate New Report</CardTitle>
                    <CardDescription>View check results for a specific date</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                            <Label>Select Date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {reportDate ? format(reportDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar 
                                  mode="single" 
                                  selected={reportDate} 
                                  onSelect={setReportDate} 
                                  initialFocus 
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={generateReport} disabled={checksLoading}>
                          {checksLoading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <FileText className="w-4 h-4 mr-2" />
                          )}
                          Generate Report
                        </Button>
                        {reportData.length > 0 && (
                          <>
                            <Button onClick={downloadPDF} variant="secondary">
                              <Download className="w-4 h-4 mr-2" />
                              Download Full Report
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
                  <a 
                    href={websites[currentCheckIndex].url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary hover:underline flex items-center gap-2"
                  >
                    {websites[currentCheckIndex].url}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block">Is it live?</Label>
                      <RadioGroup 
                        value={isLive} 
                        onValueChange={setIsLive} 
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="live-yes" />
                          <Label htmlFor="live-yes">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="live-no" />
                          <Label htmlFor="live-no">No</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div>
                      <Label className="mb-2 block">Is it functional?</Label>
                      <RadioGroup 
                        value={isFunctional} 
                        onValueChange={setIsFunctional}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="functional-yes" />
                          <Label htmlFor="functional-yes">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="functional-no" />
                          <Label htmlFor="functional-no">No</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div>
                      <Label className="mb-2 block">Is there a Problem?</Label>
                      <RadioGroup 
                        value={hasProblem} 
                        onValueChange={setHasProblem}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="problem-yes" />
                          <Label htmlFor="problem-yes">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="problem-no" />
                          <Label htmlFor="problem-no">No</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div>
                      <Label htmlFor="issue" className="mb-2 block">Issue Type</Label>
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
                      <div>
                        <Label htmlFor="notes" className="mb-2 block">Notes</Label>
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
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4 w-full">
                    <Button 
                      variant="outline"
                      onClick={pauseDailyChecks}
                      disabled={isStopping}
                      className="w-full"
                    >
                      {isPaused ? 'Resume' : 'Pause'}
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={stopDailyChecks}
                      disabled={isStopping}
                      className="w-full"
                    >
                      Stop
                    </Button>
                    <Button 
                      onClick={handleNext} 
                      disabled={isStopping || isPaused}
                      className="w-full"
                    >
                      {currentCheckIndex < websites.length - 1 ? "Save & Next" : "Finish"}
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
