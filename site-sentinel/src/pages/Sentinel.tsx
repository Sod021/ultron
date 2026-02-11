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
import { Calendar as CalendarIcon, Plus, Edit, Trash2, ExternalLink, CheckCircle2, XCircle, ClipboardCheck, Globe, FileText, Download, AlertTriangle, ChevronDown, ChevronUp, RefreshCw, Loader2, ArrowUp, ArrowDown, Info, Eye, Wrench, LogOut, Search, Sun, Moon, Menu, ChevronLeft, ChevronRight, User } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

import { useWebsites, type Website, type WebsiteInput } from "@/hooks/useWebsites";
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
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isTabletCollapsed, setIsTabletCollapsed] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem("sentinel-theme");
    const nextTheme = storedTheme ? storedTheme === "dark" : true;
    setIsDarkMode(nextTheme);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    localStorage.setItem("sentinel-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 640px)");
    const tabletQuery = window.matchMedia("(min-width: 641px) and (max-width: 1024px)");

    const handleMobileChange = () => {
      setIsMobile(mobileQuery.matches);
      if (!mobileQuery.matches) {
        setIsMobileNavOpen(false);
      }
    };
    const handleTabletChange = () => {
      setIsTablet(tabletQuery.matches);
      if (!tabletQuery.matches) {
        setIsTabletCollapsed(false);
      }
    };

    handleMobileChange();
    handleTabletChange();
    mobileQuery.addEventListener("change", handleMobileChange);
    tabletQuery.addEventListener("change", handleTabletChange);
    return () => {
      mobileQuery.removeEventListener("change", handleMobileChange);
      tabletQuery.removeEventListener("change", handleTabletChange);
    };
  }, []);
  
  const [websiteName, setWebsiteName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [hasWebsiteMail, setHasWebsiteMail] = useState("no");
  const [mailEntries, setMailEntries] = useState([{ email: "", password: "" }]);
  const [currentMailService, setCurrentMailService] = useState("");
  const [currentMailServiceOther, setCurrentMailServiceOther] = useState("");
  const [previousMailService, setPreviousMailService] = useState("");
  const [previousMailServiceOther, setPreviousMailServiceOther] = useState("");
  const [dateCreated, setDateCreated] = useState("");
  const [terminationDate, setTerminationDate] = useState("");
  const [thinkTechServer, setThinkTechServer] = useState("");
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
  const [expandedWebsiteId, setExpandedWebsiteId] = useState<number | null>(null);
  const [visiblePasswordKeys, setVisiblePasswordKeys] = useState<Record<string, boolean>>({});
  const [websiteSearchQuery, setWebsiteSearchQuery] = useState("");
  const [selectedSearchWebsiteId, setSelectedSearchWebsiteId] = useState<number | null>(null);
  const [autoFilter, setAutoFilter] = useState("all");
  const [autoSearchQuery, setAutoSearchQuery] = useState("");
  const [isAutoSearchOpen, setIsAutoSearchOpen] = useState(false);
  const [showAllAutoIssues, setShowAllAutoIssues] = useState(false);

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
  const visibleAutoChecks = showAllAutoIssues ? filteredAutoChecks : filteredAutoChecks.slice(0, 5);
  const autoIssues = autoChecks.filter(check => !check.is_live);
  const autoLiveCount = autoChecks.filter(check => check.is_live).length;
  const autoErrorCounts = autoChecks.reduce<Record<string, number>>((acc, check) => {
    if (!check.is_live) {
      acc[check.error_type] = (acc[check.error_type] || 0) + 1;
    }
    return acc;
  }, {});
  const normalizedWebsiteSearchQuery = websiteSearchQuery.trim().toLowerCase();
  const searchedWebsites = normalizedWebsiteSearchQuery
    ? websites.filter((website) => website.name.toLowerCase().includes(normalizedWebsiteSearchQuery))
    : [];
  const selectedSearchedWebsite =
    searchedWebsites.find((website) => website.id === selectedSearchWebsiteId) ||
    searchedWebsites[0] ||
    null;

  useEffect(() => {
    if (!normalizedWebsiteSearchQuery) {
      setSelectedSearchWebsiteId(null);
      return;
    }
    if (!searchedWebsites.some((website) => website.id === selectedSearchWebsiteId)) {
      setSelectedSearchWebsiteId(searchedWebsites[0]?.id ?? null);
    }
  }, [normalizedWebsiteSearchQuery, searchedWebsites, selectedSearchWebsiteId]);
  
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
      toast({ title: "Error", description: "Please fill in Website Name and URL", variant: "destructive" });
      return;
    }

    const normalizeMailServiceValue = (selected: string, other: string) => {
      if (!selected) return null;
      if (selected !== "other") return selected;
      const trimmed = other.trim();
      return trimmed || null;
    };

    const payload: WebsiteInput = {
      name: websiteName.trim(),
      url: websiteUrl.trim(),
      website_mail:
        hasWebsiteMail === "yes"
          ? mailEntries
              .map((entry) => entry.email.trim())
              .filter((email) => email.length > 0)
              .join("\n") || null
          : null,
      mail_password:
        hasWebsiteMail === "yes"
          ? mailEntries
              .map((entry) => entry.password.trim())
              .filter((password) => password.length > 0)
              .join("\n") || null
          : null,
      current_mail_service:
        hasWebsiteMail === "yes"
          ? normalizeMailServiceValue(currentMailService, currentMailServiceOther)
          : null,
      previous_mail_service:
        hasWebsiteMail === "yes"
          ? normalizeMailServiceValue(previousMailService, previousMailServiceOther)
          : null,
      date_created: hasWebsiteMail === "yes" ? dateCreated || null : null,
      termination_date: hasWebsiteMail === "yes" ? terminationDate || null : null,
      thinktech_server: hasWebsiteMail === "yes" ? thinkTechServer || null : null,
    };

    try {
      if (editingId) {
        await updateWebsiteDB(editingId, payload);
        toast({ title: "Success", description: "Website updated successfully" });
        setEditingId(null);
      } else {
        await addWebsiteDB(payload);
        toast({ title: "Success", description: "Website added successfully" });
      }
      setWebsiteName("");
      setWebsiteUrl("");
      setHasWebsiteMail("no");
      setMailEntries([{ email: "", password: "" }]);
      setCurrentMailService("");
      setCurrentMailServiceOther("");
      setPreviousMailService("");
      setPreviousMailServiceOther("");
      setDateCreated("");
      setTerminationDate("");
      setThinkTechServer("");
    } catch (error) {
      console.error("Error saving website:", error);
      toast({ title: "Error", description: "Failed to save website", variant: "destructive" });
    }
  };

  const resetWebsiteForm = () => {
    setEditingId(null);
    setWebsiteName("");
    setWebsiteUrl("");
    setHasWebsiteMail("no");
    setMailEntries([{ email: "", password: "" }]);
    setCurrentMailService("");
    setCurrentMailServiceOther("");
    setPreviousMailService("");
    setPreviousMailServiceOther("");
    setDateCreated("");
    setTerminationDate("");
    setThinkTechServer("");
  };

  const setMailServiceState = (
    value: string | null | undefined,
    setSelect: (v: string) => void,
    setOther: (v: string) => void
  ) => {
    const trimmed = value?.trim() || "";
    const normalized = trimmed.toLowerCase();
    if (!trimmed) {
      setSelect("");
      setOther("");
      return;
    }
    if (normalized === "titan") {
      setSelect("Titan");
      setOther("");
      return;
    }
    if (normalized === "hostinger") {
      setSelect("Hostinger");
      setOther("");
      return;
    }
    setSelect("other");
    setOther(trimmed);
  };

  const startWebsiteEdit = (website: Website) => {
    setWebsiteName(website.name);
    setWebsiteUrl(website.url);
    const hasMailData = Boolean(
      website.website_mail ||
      website.mail_password ||
      website.current_mail_service ||
      website.previous_mail_service ||
      website.date_created ||
      website.termination_date ||
      website.thinktech_server
    );
    setHasWebsiteMail(hasMailData ? "yes" : "no");
    const emailParts = (website.website_mail || "")
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
    const passwordParts = (website.mail_password || "")
      .split("\n")
      .map((value) => value.trim());
    const maxEntries = Math.max(emailParts.length, passwordParts.length, 1);
    setMailEntries(
      Array.from({ length: maxEntries }).map((_, index) => ({
        email: emailParts[index] || "",
        password: passwordParts[index] || "",
      }))
    );
    setMailServiceState(website.current_mail_service, setCurrentMailService, setCurrentMailServiceOther);
    setMailServiceState(website.previous_mail_service, setPreviousMailService, setPreviousMailServiceOther);
    setDateCreated(website.date_created || "");
    setTerminationDate(website.termination_date || "");
    setThinkTechServer(website.thinktech_server || "");
    setEditingId(website.id);
    setActiveTab("add-website");
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
      // Fall back to check timestamps when reportDate isn't explicitly selected in UI.
      const parsedCheckDates = checks
        .map((check) => new Date(check.created_at))
        .filter((date) => !Number.isNaN(date.getTime()));
      const inferredReportDate =
        parsedCheckDates.length > 0
          ? new Date(Math.max(...parsedCheckDates.map((date) => date.getTime())))
          : null;
      const effectiveReportDate = reportDate ?? inferredReportDate;

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
        `Report Date: ${effectiveReportDate ? format(effectiveReportDate, "PPPP") : 'N/A'}`,
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
      const filename = `${filenamePrefix}${format(effectiveReportDate || new Date(), "yyyy-MM-dd")}.pdf`;
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
    { id: "dashboard", label: "Manual Checks", icon: ClipboardCheck },
    { id: "auto-checks", label: "Automated Checks", icon: RefreshCw },
    { id: "websites", label: "Websites", icon: Globe },
    { id: "reports", label: "Reports", icon: FileText },
  ];
  const displayName = currentUser?.email || "User";

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
      {isMobile && isMobileNavOpen && (
        <button
          className="fixed inset-0 z-40 bg-black/40"
          aria-label="Close menu"
          onClick={() => setIsMobileNavOpen(false)}
        />
      )}
      <aside
        className={`bg-sidebar-background border-r border-sidebar-border flex flex-col h-screen transition-transform duration-300 dark:backdrop-blur-2xl dark:border-white/10 ${
          isMobile
            ? `fixed top-0 left-0 z-50 w-64 ${isMobileNavOpen ? "translate-x-0" : "-translate-x-full"}`
            : "sticky top-0"
        } ${isTablet ? (isTabletCollapsed ? "w-16" : "w-56") : "w-64"}`}
      >
        <div className={`border-b border-sidebar-border ${isTablet && isTabletCollapsed ? "px-3 py-4" : "p-6"}`}>
          <div className={`flex items-center ${isTablet && isTabletCollapsed ? "justify-center" : "justify-between"}`}>
            {!(isTablet && isTabletCollapsed) && (
              <div>
                <h1 className="text-2xl font-bold text-sidebar-foreground">Sentinel</h1>
                <p className="text-sm text-sidebar-foreground/70 mt-1">Website Monitor</p>
              </div>
            )}
            {isTablet && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setIsTabletCollapsed((prev) => !prev)}
                aria-label={isTabletCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isTabletCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
        <nav className={`flex-1 ${isTablet && isTabletCollapsed ? "p-2" : "p-4"}`}>
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    if (isChecking) return;
                    setActiveTab(item.id);
                    if (isMobile) setIsMobileNavOpen(false);
                  }}
                  disabled={isChecking}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === item.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground dark:border dark:border-white/10"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground dark:border dark:border-transparent"
                  } ${isChecking ? "opacity-50 cursor-not-allowed" : ""} dark:backdrop-blur-lg ${
                    isTablet && isTabletCollapsed ? "justify-center px-0 py-2.5 w-11 h-11 mx-auto gap-0" : ""
                  }`}
                  title={item.label}
                >
                  <item.icon className="w-5 h-5" />
                  {!(isTablet && isTabletCollapsed) && <span className="font-medium">{item.label}</span>}
                </button>
                {item.id === "websites" && !(isTablet && isTabletCollapsed) && (
                  <button
                    onClick={() => {
                      if (isChecking) return;
                      setActiveTab("add-website");
                      if (isMobile) setIsMobileNavOpen(false);
                    }}
                    disabled={isChecking}
                    className={`mt-1 ml-8 w-[calc(100%-2rem)] flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      activeTab === "add-website"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground dark:border dark:border-white/10"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground dark:border dark:border-transparent"
                    } ${isChecking ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="font-medium">Add Website</span>
                  </button>
                )}
                {item.id === "reports" && !(isTablet && isTabletCollapsed) && (
                  <button
                    onClick={() => {
                      if (isChecking) return;
                      setActiveTab("report-patcher");
                      if (isMobile) setIsMobileNavOpen(false);
                    }}
                    disabled={isChecking}
                    className={`mt-1 ml-8 w-[calc(100%-2rem)] flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      activeTab === "report-patcher"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground dark:border dark:border-white/10"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground dark:border dark:border-transparent"
                    } ${isChecking ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <Wrench className="w-4 h-4" />
                    <span className="font-medium">Report Patcher</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className={`flex ${isTablet && isTabletCollapsed ? "justify-center" : "justify-start"}`}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`inline-flex items-center gap-3 px-3 py-2 text-sidebar-foreground/90 transition hover:text-sidebar-foreground ${
                    isTablet && isTabletCollapsed ? "px-0 py-2 w-11 justify-center" : ""
                  }`}
                  aria-label="Open profile menu"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 shadow-sm backdrop-blur-lg">
                    <User className="h-5 w-5" />
                  </span>
                  {!(isTablet && isTabletCollapsed) && (
                    <span className="text-[12px] font-medium">{displayName}</span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {currentUser?.email || "Profile"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsDarkMode((prev) => !prev)}>
                  {isDarkMode ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  {isDarkMode ? "Light Mode" : "Dark Mode"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
        <div className="mb-4 flex items-center gap-3 md:hidden">
          <Button variant="outline" size="icon" onClick={() => setIsMobileNavOpen(true)} aria-label="Open menu">
            <Menu className="h-4 w-4" />
          </Button>
        </div>
        {!isChecking ? (
          <>
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold text-foreground md:hidden">Dashboard</h2>
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
                  <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setActiveTab('add-website')}>
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

            {activeTab === "add-website" && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-foreground mb-6 md:hidden">Add Website</h2>
                <Card>
                  <CardHeader>
                    <CardTitle>{editingId ? "Edit Website Details" : "Add Website Details"}</CardTitle>
                    <CardDescription>
                      Only Website Name and URL are required. All other details are optional and can be updated later.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="name">Website Name</Label>
                          <Input id="name" value={websiteName} onChange={(e) => setWebsiteName(e.target.value)} placeholder="My Website" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="url">URL</Label>
                          <Input id="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://example.com" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Website Mail</Label>
                        <Select
                          value={hasWebsiteMail}
                          onValueChange={(value) => {
                            setHasWebsiteMail(value);
                            if (value === "no") {
                              setMailEntries([{ email: "", password: "" }]);
                              setCurrentMailService("");
                              setCurrentMailServiceOther("");
                              setPreviousMailService("");
                              setPreviousMailServiceOther("");
                              setDateCreated("");
                              setTerminationDate("");
                              setThinkTechServer("");
                            }
                          }}
                        >
                          <SelectTrigger className="w-full md:w-[260px]">
                            <SelectValue placeholder="Does this website have mail?" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {hasWebsiteMail === "yes" && (
                        <>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label>Mail Accounts</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setMailEntries((prev) => [...prev, { email: "", password: "" }])
                                }
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Add Mail
                              </Button>
                            </div>

                            {mailEntries.map((entry, index) => (
                              <div key={`mail-entry-${index}`} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                                <Input
                                  name={`website_mail_optional_${index}`}
                                  type="email"
                                  autoComplete="off"
                                  value={entry.email}
                                  onChange={(e) =>
                                    setMailEntries((prev) =>
                                      prev.map((item, itemIndex) =>
                                        itemIndex === index ? { ...item, email: e.target.value } : item
                                      )
                                    )
                                  }
                                  placeholder="Mail address"
                                />
                                <Input
                                  name={`website_mail_password_optional_${index}`}
                                  type="password"
                                  autoComplete="new-password"
                                  value={entry.password}
                                  onChange={(e) =>
                                    setMailEntries((prev) =>
                                      prev.map((item, itemIndex) =>
                                        itemIndex === index ? { ...item, password: e.target.value } : item
                                      )
                                    )
                                  }
                                  placeholder="Mail password"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={mailEntries.length === 1}
                                  onClick={() =>
                                    setMailEntries((prev) => {
                                      if (prev.length === 1) return prev;
                                      return prev.filter((_, itemIndex) => itemIndex !== index);
                                    })
                                  }
                                  aria-label="Remove mail account"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>

                          <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Current Mail Service</Label>
                              <Select value={currentMailService} onValueChange={setCurrentMailService}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select mail service" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Titan">Titan</SelectItem>
                                  <SelectItem value="Hostinger">Hostinger</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              {currentMailService === "other" && (
                                <Input
                                  value={currentMailServiceOther}
                                  onChange={(e) => setCurrentMailServiceOther(e.target.value)}
                                  placeholder="Type current mail service"
                                />
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label>Previous Mail Service</Label>
                              <Select value={previousMailService} onValueChange={setPreviousMailService}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select previous service" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Titan">Titan</SelectItem>
                                  <SelectItem value="Hostinger">Hostinger</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              {previousMailService === "other" && (
                                <Input
                                  value={previousMailServiceOther}
                                  onChange={(e) => setPreviousMailServiceOther(e.target.value)}
                                  placeholder="Type previous mail service"
                                />
                              )}
                            </div>
                          </div>

                          <div className="grid gap-6 md:grid-cols-3">
                            <div className="space-y-2">
                              <Label htmlFor="date-created">Mail Date Created</Label>
                              <Input
                                id="date-created"
                                type="date"
                                value={dateCreated}
                                onChange={(e) => setDateCreated(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="termination-date">Mail Termination Date</Label>
                              <Input
                                id="termination-date"
                                type="date"
                                value={terminationDate}
                                onChange={(e) => setTerminationDate(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="flex h-6 items-center gap-2">
                                <Label>ThinkTech Server</Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className="text-muted-foreground hover:text-foreground transition-colors"
                                      aria-label="ThinkTech Server info"
                                    >
                                      <Info className="h-4 w-4" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Which server was used to create this mail</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Select value={thinkTechServer} onValueChange={setThinkTechServer}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select server" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Server 1">Server 1</SelectItem>
                                  <SelectItem value="Server 2">Server 2</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </>
                      )}

                      <div className="space-y-2 pt-2">
                        <div className="flex flex-wrap gap-2">
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
                            <Button variant="outline" onClick={resetWebsiteForm}>
                              Cancel
                            </Button>
                          )}
                        </div>
                        {importError && <p className="text-sm text-destructive">{importError}</p>}
                        <p className="text-xs text-muted-foreground">
                          CSV format: <code className="bg-muted px-1 rounded">name,url</code>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "websites" && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-foreground mb-6 md:hidden">Websites</h2>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Total Websites</CardTitle>
                      <CardDescription>Websites currently tracked</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold">
                        {websitesLoading ? (
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        ) : (
                          websites.length
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className="cursor-pointer transition hover:border-primary/40 hover:bg-muted/40"
                    onClick={() => setActiveTab("add-website")}
                  >
                    <CardHeader>
                      <CardTitle>Add a Website</CardTitle>
                      <CardDescription>Click to add website</CardDescription>
                    </CardHeader>
                    <CardContent className="flex min-h-[96px] items-center justify-start">
                      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#1b1f27] shadow-lg shadow-black/20">
                        <Plus className="h-7 w-7 text-white" />
                      </span>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Search Website</CardTitle>
                    <CardDescription>Type a website name to view complete details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="website-search"
                        value={websiteSearchQuery}
                        onChange={(e) => setWebsiteSearchQuery(e.target.value)}
                        placeholder="Search by website name..."
                        className="pl-10"
                      />
                    </div>

                    {normalizedWebsiteSearchQuery && (
                      <div className="space-y-3">
                        {searchedWebsites.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {searchedWebsites.map((website) => (
                              <Button
                                key={`search-result-${website.id}`}
                                type="button"
                                size="sm"
                                variant={selectedSearchedWebsite?.id === website.id ? "default" : "outline"}
                                onClick={() => setSelectedSearchWebsiteId(website.id)}
                              >
                                {website.name}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No website matched your search.</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selectedSearchedWebsite && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-2xl">Website Details</CardTitle>
                      <CardDescription>Full details for the selected website</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">Website Name</p>
                        <p className="text-2xl font-semibold text-foreground">{selectedSearchedWebsite.name}</p>
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">URL</p>
                        <a
                          href={selectedSearchedWebsite.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg text-primary hover:underline inline-flex items-center gap-2 break-all"
                        >
                          {selectedSearchedWebsite.url}
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>

                      <div className="space-y-4">
                        <p className="text-sm font-medium text-muted-foreground">Website Mail Accounts</p>
                        {selectedSearchedWebsite.website_mail || selectedSearchedWebsite.mail_password ? (
                          <div className="space-y-4">
                            {Array.from({
                              length: Math.max(
                                (selectedSearchedWebsite.website_mail || "").split("\n").filter(Boolean).length,
                                (selectedSearchedWebsite.mail_password || "").split("\n").length,
                                1
                              ),
                            }).map((_, index) => {
                              const emails = (selectedSearchedWebsite.website_mail || "")
                                .split("\n")
                                .map((item) => item.trim())
                                .filter(Boolean);
                              const passwords = (selectedSearchedWebsite.mail_password || "")
                                .split("\n")
                                .map((item) => item.trim());
                              const passwordKey = `search-${selectedSearchedWebsite.id}-${index}`;
                              const rawPassword = passwords[index] || "";
                              const isVisible = Boolean(visiblePasswordKeys[passwordKey]);

                              return (
                                <div key={passwordKey} className="rounded-lg border bg-background p-5 space-y-4">
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">Mail {index + 1}</p>
                                    <p className="text-lg text-foreground break-all">{emails[index] || "-"}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">Password</p>
                                    <div className="flex flex-wrap items-center gap-3">
                                      <code className="rounded bg-muted px-3 py-2 text-base text-foreground">
                                        {rawPassword
                                          ? (isVisible ? rawPassword : "•".repeat(Math.max(rawPassword.length, 8)))
                                          : "-"}
                                      </code>
                                      {rawPassword && (
                                        <>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                              setVisiblePasswordKeys((prev) => ({
                                                ...prev,
                                                [passwordKey]: !prev[passwordKey],
                                              }))
                                            }
                                          >
                                            <Eye className="w-4 h-4 mr-2" />
                                            {isVisible ? "Hide" : "Show"}
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            onClick={async () => {
                                              try {
                                                await navigator.clipboard.writeText(rawPassword);
                                                toast({ title: "Copied", description: "Password copied to clipboard" });
                                              } catch (error) {
                                                toast({
                                                  title: "Copy failed",
                                                  description: "Unable to copy password",
                                                  variant: "destructive",
                                                });
                                              }
                                            }}
                                          >
                                            Copy
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-lg text-muted-foreground">No mail configured</p>
                        )}
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Current Mail Service</p>
                          <p className="text-lg text-foreground">{selectedSearchedWebsite.current_mail_service || "-"}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Previous Mail Service</p>
                          <p className="text-lg text-foreground">{selectedSearchedWebsite.previous_mail_service || "-"}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Mail Date Created</p>
                          <p className="text-lg text-foreground">{selectedSearchedWebsite.date_created || "-"}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Mail Termination Date</p>
                          <p className="text-lg text-foreground">{selectedSearchedWebsite.termination_date || "-"}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">ThinkTech Server</p>
                          <p className="text-lg text-foreground">{selectedSearchedWebsite.thinktech_server || "-"}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Record Created</p>
                          <p className="text-lg text-foreground">{format(new Date(selectedSearchedWebsite.created_at), "PPpp")}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="outline"
                          onClick={() => startWebsiteEdit(selectedSearchedWebsite)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Website
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={async () => {
                            try {
                              await deleteWebsiteDB(selectedSearchedWebsite.id);
                              toast({ title: "Success", description: "Website deleted" });
                              setSelectedSearchWebsiteId(null);
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to delete website",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Website
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

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
                              <div key={website.id} className="border rounded-lg overflow-hidden">
                                <button
                                  type="button"
                                  className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors text-left"
                                  onClick={() =>
                                    setExpandedWebsiteId((prev) => (prev === website.id ? null : website.id))
                                  }
                                >
                                  <div className="min-w-0">
                                    <h3 className="font-semibold text-foreground truncate">{website.name}</h3>
                                    <p className="text-sm text-muted-foreground truncate">{website.url}</p>
                                  </div>
                                  {expandedWebsiteId === website.id ? (
                                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </button>

                                {expandedWebsiteId === website.id && (
                                  <div className="border-t bg-muted/20 p-6 space-y-5">
                                    <div>
                                      <p className="text-xs text-muted-foreground">Website Name</p>
                                      <p className="font-medium text-foreground">{website.name}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">URL</p>
                                      <a
                                        href={website.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                                      >
                                        {website.url}
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Website Mail</p>
                                      {website.website_mail || website.mail_password ? (
                                        <div className="space-y-3 mt-2">
                                          {Array.from({
                                            length: Math.max(
                                              (website.website_mail || "").split("\n").filter(Boolean).length,
                                              (website.mail_password || "").split("\n").length,
                                              1
                                            ),
                                          }).map((_, index) => {
                                            const emails = (website.website_mail || "")
                                              .split("\n")
                                              .map((item) => item.trim())
                                              .filter(Boolean);
                                            const passwords = (website.mail_password || "")
                                              .split("\n")
                                              .map((item) => item.trim());
                                            const passwordKey = `${website.id}-${index}`;
                                            const rawPassword = passwords[index] || "";
                                            const isVisible = Boolean(visiblePasswordKeys[passwordKey]);

                                            return (
                                              <div key={passwordKey} className="rounded-md border bg-background/60 p-4 space-y-3">
                                                <div>
                                                  <p className="text-xs text-muted-foreground">Mail {index + 1}</p>
                                                  <p className="text-sm text-foreground break-all">
                                                    {emails[index] || "-"}
                                                  </p>
                                                </div>
                                                <div>
                                                  <p className="text-xs text-muted-foreground">Password</p>
                                                  <div className="flex flex-wrap items-center gap-2">
                                                    <code className="rounded bg-muted px-2 py-1 text-xs text-foreground">
                                                      {rawPassword
                                                        ? (isVisible ? rawPassword : "•".repeat(Math.max(rawPassword.length, 8)))
                                                        : "-"}
                                                    </code>
                                                    {rawPassword && (
                                                      <>
                                                        <Button
                                                          type="button"
                                                          variant="outline"
                                                          size="sm"
                                                          onClick={() =>
                                                            setVisiblePasswordKeys((prev) => ({
                                                              ...prev,
                                                              [passwordKey]: !prev[passwordKey],
                                                            }))
                                                          }
                                                        >
                                                          <Eye className="w-4 h-4 mr-1" />
                                                          {isVisible ? "Hide" : "Show"}
                                                        </Button>
                                                        <Button
                                                          type="button"
                                                          variant="outline"
                                                          size="sm"
                                                          onClick={async () => {
                                                            try {
                                                              await navigator.clipboard.writeText(rawPassword);
                                                              toast({ title: "Copied", description: "Password copied to clipboard" });
                                                            } catch (error) {
                                                              toast({
                                                                title: "Copy failed",
                                                                description: "Unable to copy password",
                                                                variant: "destructive",
                                                              });
                                                            }
                                                          }}
                                                        >
                                                          Copy
                                                        </Button>
                                                      </>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">No mail configured</p>
                                      )}
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                      <div>
                                        <p className="text-xs text-muted-foreground">Current Mail Service</p>
                                        <p className="text-sm text-foreground">{website.current_mail_service || "-"}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Previous Mail Service</p>
                                        <p className="text-sm text-foreground">{website.previous_mail_service || "-"}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Mail Date Created</p>
                                        <p className="text-sm text-foreground">{website.date_created || "-"}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Mail Termination Date</p>
                                        <p className="text-sm text-foreground">{website.termination_date || "-"}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">ThinkTech Server</p>
                                        <p className="text-sm text-foreground">{website.thinktech_server || "-"}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Record Created</p>
                                        <p className="text-sm text-foreground">{format(new Date(website.created_at), "PPpp")}</p>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          startWebsiteEdit(website);
                                        }}
                                      >
                                        <Edit className="w-4 h-4 mr-1" />
                                        Edit
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          try {
                                            await deleteWebsiteDB(website.id);
                                            toast({ title: "Success", description: "Website deleted" });
                                            setExpandedWebsiteId((prev) => (prev === website.id ? null : prev));
                                          } catch (e) {
                                            toast({ title: "Error", description: "Failed to delete website", variant: "destructive" });
                                          }
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Delete
                                      </Button>
                                    </div>
                                  </div>
                                )}
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
                <h2 className="text-3xl font-bold text-foreground md:hidden">Report Patcher</h2>
                <ReportPatcher currentUser={currentUser?.email || 'System'} />
              </div>
            )}

            {activeTab === "auto-checks" && (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-foreground md:hidden">Automated Checks</h2>
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
                      <div className="space-y-3">
                        <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="bg-muted/50 text-left">
                              <th className="border p-2">Website</th>
                              <th className="border p-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-1">
                                      Status <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                                    HTTP status code from the check. 200-299 = OK, 300-399 = redirect, 400-499 =
                                    client error (403 blocked, 404 not found), 500+ = server error. N/A means no
                                    response.
                                  </TooltipContent>
                                </Tooltip>
                              </th>
                              <th className="border p-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-1">
                                      Error Type <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                                    Classification for failures: timeout (no response in time), dns (domain did not
                                    resolve), 403/500/http (HTTP errors). "ok" means the site responded normally.
                                  </TooltipContent>
                                </Tooltip>
                              </th>
                              <th className="border p-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-1">
                                      Response <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                                    Response time in milliseconds. "-" means the request failed before a response was
                                    received.
                                  </TooltipContent>
                                </Tooltip>
                              </th>
                              <th className="border p-2">Last Checked</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleAutoChecks.map((check) => (
                              <tr key={check.id} className="border-b">
                                <td className="border p-2">
                                  <div className="font-medium">{check.website_name}</div>
                                  <a
                                    href={check.website_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline"
                                  >
                                    {check.website_url}
                                  </a>
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
                        {filteredAutoChecks.length > 5 && (
                          <div className="flex">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => setShowAllAutoIssues((prev) => !prev)}
                            >
                              {showAllAutoIssues ? "Show Less" : `View All (${filteredAutoChecks.length})`}
                            </Button>
                          </div>
                        )}
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
                              <a
                                href={check.website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                {check.website_url}
                              </a>
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
                <h2 className="text-3xl font-bold text-foreground md:hidden">Reports</h2>
                
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
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1 space-y-2">
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
                        <Button onClick={generateReport} disabled={checksLoading} className="sm:mb-[2px]">
                          {checksLoading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <FileText className="w-4 h-4 mr-2" />
                          )}
                          Generate Report
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
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
