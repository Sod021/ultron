import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface ReportFix {
  id?: number;
  daily_check_id: number;
  fix_notes: string;
  fixed_by: string;
  fixed_at: string;
  status: 'pending' | 'fixed' | 'wont_fix';
  created_at?: string;
  updated_at?: string;
}

export const useReportFixes = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const storageKey = 'sentinel:reportFixes';

  const loadFromStorage = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as ReportFix[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error loading report fixes from storage:', error);
      return [];
    }
  };

  const saveToStorage = (next: ReportFix[]) => {
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const getFixesByCheckId = useCallback(async (checkId: number): Promise<ReportFix | null> => {
    try {
      const fixes = loadFromStorage();
      return fixes.find(fix => fix.daily_check_id === checkId) || null;
    } catch (error) {
      console.error('Error fetching report fix:', error);
      toast({
        title: 'Error',
        description: 'Failed to load report fix',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const saveFix = useCallback(async (fix: Omit<ReportFix, 'id' | 'created_at' | 'updated_at'>): Promise<ReportFix | null> => {
    setIsLoading(true);
    try {
      const fixes = loadFromStorage();
      const now = new Date().toISOString();
      const existingIndex = fixes.findIndex(f => f.daily_check_id === fix.daily_check_id);
      let data: ReportFix;

      if (existingIndex >= 0) {
        const existing = fixes[existingIndex];
        data = {
          ...existing,
          fix_notes: fix.fix_notes,
          fixed_by: fix.fixed_by,
          status: fix.status,
          fixed_at: now,
          updated_at: now,
        };
        fixes[existingIndex] = data;
      } else {
        data = {
          id: Date.now(),
          created_at: now,
          updated_at: now,
          fixed_at: now,
          ...fix,
        };
        fixes.unshift(data);
      }

      saveToStorage(fixes);

      toast({
        title: 'Success',
        description: 'Report fix saved successfully',
      });

      return data;
    } catch (error) {
      console.error('Error saving report fix:', error);
      toast({
        title: 'Error',
        description: 'Failed to save report fix',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const deleteFix = useCallback(async (checkId: number): Promise<boolean> => {
    try {
      const fixes = loadFromStorage();
      const next = fixes.filter(fix => fix.daily_check_id !== checkId);
      saveToStorage(next);

      toast({
        title: 'Success',
        description: 'Report fix deleted successfully',
      });

      return true;
    } catch (error) {
      console.error('Error deleting report fix:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete report fix',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  return {
    isLoading,
    getFixesByCheckId,
    saveFix,
    deleteFix,
  };
};
