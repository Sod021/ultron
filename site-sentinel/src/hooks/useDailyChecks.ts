import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface DailyCheck {
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

export const useDailyChecks = () => {
  const [dailyChecks, setDailyChecks] = useState<DailyCheck[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const storageKey = 'sentinel:dailyChecks';

  const loadFromStorage = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as DailyCheck[]) : [];
      const next = Array.isArray(parsed) ? parsed : [];
      setDailyChecks(next);
      return next;
    } catch (error) {
      console.error('Error loading checks from storage:', error);
      setDailyChecks([]);
      return [];
    }
  };

  const saveToStorage = (next: DailyCheck[]) => {
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  // Fetch all daily checks
  const fetchDailyChecks = async () => {
    setIsLoading(true);
    try {
      loadFromStorage();
    } catch (error) {
      console.error('Error fetching daily checks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load check history',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new daily check
  const addDailyCheck = async (check: Omit<DailyCheck, 'id' | 'created_at'>) => {
    try {
      const data: DailyCheck = {
        id: Date.now(),
        created_at: new Date().toISOString(),
        ...check,
      };
      setDailyChecks(prev => {
        const next = [data, ...prev];
        saveToStorage(next);
        return next;
      });
      return data;
    } catch (error) {
      console.error('Error adding daily check:', error);
      toast({
        title: 'Error',
        description: 'Failed to save check',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Get checks by date range
  const getChecksByDate = async (date: string) => {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const source = loadFromStorage();
      const data = source.filter(check => {
        const createdAt = new Date(check.created_at);
        return createdAt >= startOfDay && createdAt <= endOfDay;
      });
      return data;
    } catch (error) {
      console.error('Error fetching checks by date:', error);
      toast({
        title: 'Error',
        description: 'Failed to load checks for selected date',
        variant: 'destructive',
      });
      return [];
    }
  };

  // Delete a daily check
  const deleteDailyCheck = async (id: number) => {
    try {
      setDailyChecks(prev => {
        const next = prev.filter(c => c.id !== id);
        saveToStorage(next);
        return next;
      });
      toast({
        title: 'Success',
        description: 'Check deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting check:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete check',
        variant: 'destructive',
      });
    }
  };

  // Clear all daily checks
  const clearAllChecks = async () => {
    try {
      setDailyChecks(() => {
        const next: DailyCheck[] = [];
        saveToStorage(next);
        return next;
      });
      toast({
        title: 'Success',
        description: 'All reports have been cleared',
      });
    } catch (error) {
      console.error('Error clearing checks:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear reports',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchDailyChecks();
  }, []);

  return {
    dailyChecks,
    isLoading,
    fetchDailyChecks,
    addDailyCheck,
    getChecksByDate,
    deleteDailyCheck,
    clearAllChecks,
  };
};
