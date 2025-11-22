import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

  // Fetch all daily checks
  const fetchDailyChecks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_checks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDailyChecks(data || []);
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
      const { data, error } = await supabase
        .from('daily_checks')
        .insert([check])
        .select()
        .single();

      if (error) throw error;

      setDailyChecks(prev => [data, ...prev]);
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

      const { data, error } = await supabase
        .from('daily_checks')
        .select('*')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
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
      const { error } = await supabase
        .from('daily_checks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDailyChecks(prev => prev.filter(c => c.id !== id));
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
      const { error } = await supabase
        .from('daily_checks')
        .delete()
        .neq('id', 0); // Delete all records

      if (error) throw error;

      setDailyChecks([]);
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
