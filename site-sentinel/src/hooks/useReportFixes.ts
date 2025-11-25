import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

  const getFixesByCheckId = useCallback(async (checkId: number): Promise<ReportFix | null> => {
    try {
      const { data, error } = await supabase
        .from('report_fixes')
        .select('*')
        .eq('daily_check_id', checkId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return data || null;
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
      // Check if a fix already exists for this check
      const { data: existing } = await supabase
        .from('report_fixes')
        .select('id')
        .eq('daily_check_id', fix.daily_check_id)
        .maybeSingle();

      let data, error;
      
      if (existing) {
        // Update existing fix
        ({ data, error } = await supabase
          .from('report_fixes')
          .update({
            fix_notes: fix.fix_notes,
            fixed_by: fix.fixed_by,
            status: fix.status,
            fixed_at: new Date().toISOString()
          })
          .eq('daily_check_id', fix.daily_check_id)
          .select()
          .single());
      } else {
        // Create new fix
        ({ data, error } = await supabase
          .from('report_fixes')
          .insert([{
            ...fix,
            fixed_at: new Date().toISOString()
          }])
          .select()
          .single());
      }

      if (error) throw error;

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
      const { error } = await supabase
        .from('report_fixes')
        .delete()
        .eq('daily_check_id', checkId);

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
