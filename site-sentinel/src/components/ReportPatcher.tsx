import { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Download, Save, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useDailyChecks } from '@/hooks/useDailyChecks';
import { useReportFixes } from '@/hooks/useReportFixes';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as pdfjs from 'pdf-parse';

interface ReportPatcherProps {
  currentUser: string;
}

export const ReportPatcher = ({ currentUser }: ReportPatcherProps) => {
  const { toast } = useToast();
  const { getChecksByDate } = useDailyChecks();
  const { getFixesByCheckId, saveFix, isLoading: isSaving } = useReportFixes();
  
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fixes, setFixes] = useState<Record<number, any>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Then update the handleFileUpload function
const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;
  
  if (file.type !== 'application/pdf') {
    toast({
      title: 'Invalid File',
      description: 'Please upload a valid PDF file',
      variant: 'destructive',
    });
    return;
  }

  setIsUploading(true);
  try {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const pdfData = e.target?.result;
        if (!pdfData) return;

        // Parse the PDF
        const pdf = await pdfjs.default(pdfData);
        const text = pdf.text;
        
        // Debug: Log the extracted PDF text
        console.log('=== PDF Text Content ===');
        console.log(text);
        console.log('=== End of PDF Text ===');
        
        // Split the text into lines and clean them up
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        
        // Find the start of the table (look for 'Website' on its own line)
        const websiteHeaderIndex = lines.findIndex(line => 
          line.trim() === 'Website'
        );
        
        if (websiteHeaderIndex === -1 || websiteHeaderIndex >= lines.length - 1) {
          throw new Error('Could not find report table in PDF');
        }

        // Get the data rows (skip the header lines and any separator lines)
        const dataLines = lines.slice(websiteHeaderIndex + 2).filter(line => 
          !line.includes('---') &&  // Skip separator lines
          line.trim() !== '' &&     // Skip empty lines
          !line.includes('Live') && // Skip the header line with Live/Functional/Issue/Notes
          !line.includes('Functional') &&
          !line.includes('Issue') &&
          !line.includes('Notes')
        );

        // Parse each data row
        const parsedData = [];
        for (let i = 0; i < dataLines.length; i += 2) {
          // Get website name from current line and URL from next line
          const websiteName = dataLines[i].trim();
          const nextLine = dataLines[i + 1]?.trim() || '';
          
          // Extract URL if it exists in the next line
          let websiteUrl = '';
          if (nextLine.startsWith('http')) {
            websiteUrl = nextLine;
          }
          
          // The rest of the columns are on the same line as the URL or the line after
          const dataLine = websiteUrl ? (dataLines[i + 2]?.trim() || '') : nextLine;
          const columns = dataLine.split(/\s{2,}/).filter(col => col.trim() !== '');
          
          // If we couldn't find columns, try the next line
          if (columns.length < 3 && dataLines[i + 3]) {
            const nextDataLine = dataLines[i + 3].trim();
            if (nextDataLine) {
              const nextColumns = nextDataLine.split(/\s{2,}/).filter(col => col.trim() !== '');
              if (nextColumns.length >= 3) {
                columns.push(...nextColumns);
                i++; // Skip the next line as we've used it
              }
            }
          }
          
          // Get status values - handle different formats like "Live: Yes" or just "Yes"
          const getStatusValue = (col: string) => {
            if (!col) return false;
            // Handle both "Live: Yes" and "Yes" formats
            const parts = col.split(':');
            const value = parts.length > 1 ? parts[1].trim() : parts[0].trim();
            return value.toLowerCase() === 'yes';
          };
          
          const isLive = getStatusValue(columns[0]);
          const isFunctional = getStatusValue(columns[1]);
          const hasProblem = getStatusValue(columns[2]);
          
          // Notes might contain spaces, so we take the rest of the columns
          // Skip the first 3 columns (Live, Functional, Issue) and join the rest
          const notes = columns.slice(3).join(' ').trim();

          // Only add the entry if we have a valid website name
          if (websiteName && websiteName !== 'Website') {
            parsedData.push({
              id: Date.now() + i,
              website_name: websiteName,
              website_url: websiteUrl || `https://${websiteName.toLowerCase().replace(/\s+/g, '')}.com`,
              is_live: isLive,
              is_functional: isFunctional,
              has_problem: hasProblem,
              notes: notes || '-',
              created_at: new Date().toISOString(),
            });
            
            // If we found a URL in the next line, skip it in the next iteration
            if (websiteUrl) i++;
          }
        }

        // If no data was parsed, add a default entry
        if (parsedData.length === 0) {
          parsedData.push({
            id: Date.now(),
            website_name: 'Uploaded Report',
            website_url: 'https://example.com',
            is_live: true,
            is_functional: true,
            has_problem: false,
            notes: 'No data could be extracted from the PDF',
            created_at: new Date().toISOString(),
          });
        }

        // Initialize fixes for the uploaded data
        const newFixes: Record<number, any> = {};
        parsedData.forEach(item => {
          newFixes[item.id] = {
            daily_check_id: item.id,
            fix_notes: '',
            fixed_by: currentUser,
            status: 'pending',
          };
        });

        setReportData(parsedData);
        setFixes(newFixes);
        setSelectedDate(new Date());

        toast({
          title: 'Success',
          description: `Processed ${parsedData.length} entries from PDF`,
        });
      } catch (error) {
        console.error('Error processing PDF:', error);
        toast({
          title: 'Error',
          description: 'Failed to process PDF content. Please check the format and try again.',
          variant: 'destructive',
        });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      toast({
        title: 'Error',
        description: 'Failed to read PDF file',
        variant: 'destructive',
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsUploading(false);
    };

    // Start reading the file
    reader.readAsArrayBuffer(file);
  } catch (error) {
    console.error('Error processing PDF:', error);
    toast({
      title: 'Error',
      description: 'Failed to process PDF',
      variant: 'destructive',
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsUploading(false);
  }
};

  const loadReport = async () => {
    if (!selectedDate) {
      toast({
        title: 'Error',
        description: 'Please select a date',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const checks = await getChecksByDate(dateStr);
      
      // Fetch existing fixes for these checks
      const fixesData: Record<number, any> = {};
      await Promise.all(
        checks.map(async (check: any) => {
          const fix = await getFixesByCheckId(check.id);
          if (fix) {
            fixesData[check.id] = fix;
          } else {
            // Initialize with default values
            fixesData[check.id] = {
              daily_check_id: check.id,
              fix_notes: '',
              fixed_by: currentUser,
              status: 'pending',
            };
          }
        })
      );

      setReportData(checks);
      setFixes(fixesData);
    } catch (error) {
      console.error('Error loading report:', error);
      toast({
        title: 'Error',
        description: 'Failed to load report',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFixChange = (checkId: number, field: string, value: any) => {
    setFixes(prev => ({
      ...prev,
      [checkId]: {
        ...prev[checkId],
        [field]: value,
      },
    }));
  };

  const saveAllFixes = async () => {
    try {
      for (const checkId in fixes) {
        const fix = fixes[checkId];
        if (fix.fix_notes.trim()) {
          await saveFix({
            ...fix,
            fixed_by: currentUser,
          });
        }
      }
      
      toast({
        title: 'Success',
        description: 'All fixes saved successfully',
      });
    } catch (error) {
      console.error('Error saving fixes:', error);
      toast({
        title: 'Error',
        description: 'Failed to save some fixes',
        variant: 'destructive',
      });
    }
  };

  const exportToPDF = () => {
    if (reportData.length === 0) return;

    const doc = new jsPDF();
    const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : 'report';
    
    // Add title
    doc.setFontSize(18);
    doc.text(`Patched Report - ${dateStr}`, 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Generated by: ${currentUser}`, 14, 36);

    // Prepare data for the table
    const tableData = reportData.map((check) => [
      check.website_name,
      check.website_url,
      check.is_live ? 'Yes' : 'No',
      check.is_functional ? 'Yes' : 'No',
      check.has_problem ? 'Yes' : 'No',
      check.notes || '-',
      fixes[check.id]?.status || 'Not fixed',
      fixes[check.id]?.fix_notes || '-',
      fixes[check.id]?.fixed_by || '-',
      fixes[check.id]?.fixed_at ? format(parseISO(fixes[check.id].fixed_at), 'PPpp') : '-',
    ]);

    // Add table
    autoTable(doc, {
      head: [
        ['Website', 'URL', 'Live', 'Functional', 'Issue', 'Original Notes', 'Status', 'Fix Notes', 'Fixed By', 'Fixed At']
      ],
      body: tableData,
      startY: 45,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 40 },
        2: { cellWidth: 12 },
        3: { cellWidth: 15 },
        4: { cellWidth: 15 },
        5: { cellWidth: 30 },
        6: { cellWidth: 15 },
        7: { cellWidth: 30 },
        8: { cellWidth: 20 },
        9: { cellWidth: 25 },
      },
    });

    // Save the PDF
    doc.save(`patched-report-${dateStr}.pdf`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'fixed':
        return <Badge className="bg-green-500 hover:bg-green-600">Fixed</Badge>;
      case 'wont_fix':
        return <Badge variant="destructive">Won't Fix</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Load Report from Date</CardTitle>
            <CardDescription>Select a date to load the report for patching</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <div className="flex-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button 
                onClick={loadReport} 
                disabled={!selectedDate || isLoading}
                className="w-full"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Load Report
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload Report</CardTitle>
            <CardDescription>Upload a PDF report to patch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center space-y-4 p-4 border-2 border-dashed rounded-lg">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Drag and drop your PDF here, or click to browse</p>
                <Button 
                  variant="outline" 
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Select PDF File'
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-muted-foreground">Supports PDF files only</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {reportData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Report for {format(selectedDate!, 'PPP')}</CardTitle>
              <CardDescription>
                {reportData.length} website{reportData.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToPDF}>
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
              <Button onClick={saveAllFixes} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save All Fixes
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {reportData.map((check) => (
                <div key={check.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h3 className="font-medium">{check.website_name}</h3>
                      <a
                        href={check.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {check.website_url}
                      </a>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={check.is_live ? 'default' : 'destructive'}>
                        {check.is_live ? 'Live' : 'Not Live'}
                      </Badge>
                      <Badge variant={check.is_functional ? 'default' : 'destructive'}>
                        {check.is_functional ? 'Functional' : 'Not Functional'}
                      </Badge>
                      <Badge variant={check.has_problem ? 'destructive' : 'default'}>
                        {check.has_problem ? 'Has Issues' : 'No Issues'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Original Notes</Label>
                    <p className="text-sm text-muted-foreground">{check.notes || 'No notes'}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`status-${check.id}`}>Status</Label>
                      <Select
                        value={fixes[check.id]?.status || 'pending'}
                        onValueChange={(value) => handleFixChange(check.id, 'status', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="fixed">Fixed</SelectItem>
                          <SelectItem value="wont_fix">Won't Fix</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Fixed By</Label>
                      <Input
                        value={fixes[check.id]?.fixed_by || currentUser}
                        onChange={(e) => handleFixChange(check.id, 'fixed_by', e.target.value)}
                        placeholder="Who fixed this?"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor={`fix-notes-${check.id}`}>Fix Notes</Label>
                    <Textarea
                      id={`fix-notes-${check.id}`}
                      value={fixes[check.id]?.fix_notes || ''}
                      onChange={(e) => handleFixChange(check.id, 'fix_notes', e.target.value)}
                      placeholder="Describe what was fixed or why it won't be fixed..."
                      rows={3}
                    />
                  </div>
                  
                  {fixes[check.id]?.fixed_at && (
                    <div className="text-xs text-muted-foreground">
                      Last updated: {format(new Date(fixes[check.id].fixed_at), 'PPpp')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
