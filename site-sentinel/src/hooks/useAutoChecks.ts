import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface AutoCheck {
  id: number;
  user_id: string;
  website_id: number;
  website_name: string;
  website_url: string;
  status_code: number | null;
  error_type: string;
  response_time_ms: number | null;
  checked_at: string;
  is_live: boolean;
}

export const useAutoChecks = () => {
  const [autoChecks, setAutoChecks] = useState<AutoCheck[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchAutoChecks = async () => {
    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setAutoChecks([]);
        return;
      }

      const { data, error } = await supabase
        .from('auto_checks')
        .select('*')
        .eq('user_id', authData.user.id)
        .order('checked_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setAutoChecks((data || []) as AutoCheck[]);
    } catch (error) {
      console.error('Error fetching automated checks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load automated checks',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runAutoChecksNow = async () => {
    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error('You must be signed in to run checks.');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error('Missing session token.');
      }

      const { data, error } = await supabase.functions.invoke('auto-checks', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Automated checks started',
        description: `Inserted ${(data as { inserted?: number })?.inserted ?? 0} checks.`,
      });

      await fetchAutoChecks();
    } catch (error) {
      console.error('Error running automated checks:', error);
      toast({
        title: 'Failed to run checks',
        description: error instanceof Error ? error.message : 'Unable to run automated checks',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAutoChecks();
  }, []);

  return {
    autoChecks,
    isLoading,
    fetchAutoChecks,
    runAutoChecksNow,
  };
};
