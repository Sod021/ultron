import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

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

  const getFixesByCheckId = useCallback(async (checkId: number): Promise<ReportFix | null> => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        return null;
      }

      const { data, error } = await supabase
        .from('report_fixes')
        .select('*')
        .eq('daily_check_id', checkId)
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (error) throw error;
      return (data as ReportFix) || null;
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
      const now = new Date().toISOString();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error('You must be signed in to save a fix.');
      }

      const payload = {
        ...fix,
        user_id: authData.user.id,
        fixed_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from('report_fixes')
        .upsert(payload, { onConflict: 'daily_check_id' })
        .select('*')
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Report fix saved successfully',
      });

      return data as ReportFix;
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
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error('You must be signed in to delete a fix.');
      }

      const { error } = await supabase
        .from('report_fixes')
        .delete()
        .eq('daily_check_id', checkId)
        .eq('user_id', authData.user.id);

      if (error) throw error;

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
