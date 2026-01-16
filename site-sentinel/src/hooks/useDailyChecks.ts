import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

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
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setDailyChecks([]);
        return;
      }

      const { data, error } = await supabase
        .from('daily_checks')
        .select('*')
        .eq('user_id', authData.user.id)
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
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error('You must be signed in to save a check.');
      }

      const { data, error } = await supabase
        .from('daily_checks')
        .insert({
          ...check,
          user_id: authData.user.id,
        })
        .select('*')
        .single();

      if (error) throw error;
      setDailyChecks(prev => [data as DailyCheck, ...prev]);
      return data as DailyCheck;
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
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        return [];
      }

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('daily_checks')
        .select('*')
        .eq('user_id', authData.user.id)
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
      const { error } = await supabase.from('daily_checks').delete().eq('id', id);
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
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error('You must be signed in to clear reports.');
      }

      const { error } = await supabase.from('daily_checks').delete().eq('user_id', authData.user.id);
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
