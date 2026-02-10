import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

export interface Website {
  id: number;
  name: string;
  url: string;
  created_at: string;
  website_mail?: string | null;
  mail_password?: string | null;
  current_mail_service?: string | null;
  previous_mail_service?: string | null;
  date_created?: string | null;
  termination_date?: string | null;
  thinktech_server?: string | null;
}

export type WebsiteInput = {
  name: string;
  url: string;
  website_mail?: string | null;
  mail_password?: string | null;
  current_mail_service?: string | null;
  previous_mail_service?: string | null;
  date_created?: string | null;
  termination_date?: string | null;
  thinktech_server?: string | null;
};

export const useWebsites = () => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch all websites
  const fetchWebsites = async () => {
    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setWebsites([]);
        return;
      }

      const { data, error } = await supabase
        .from('websites')
        .select('*')
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebsites(data || []);
    } catch (error) {
      console.error('Error fetching websites:', error);
      toast({
        title: 'Error',
        description: 'Failed to load websites',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new website
  const addWebsite = async (website: WebsiteInput) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error('You must be signed in to add a website.');
      }

      const payload = {
        ...website,
        website_mail: website.website_mail || null,
        mail_password: website.mail_password || null,
        current_mail_service: website.current_mail_service || null,
        previous_mail_service: website.previous_mail_service || null,
        date_created: website.date_created || null,
        termination_date: website.termination_date || null,
        thinktech_server: website.thinktech_server || null,
      };

      const { data, error } = await supabase
        .from('websites')
        .insert({
          ...payload,
          user_id: authData.user.id,
        })
        .select('*')
        .single();

      if (error) throw error;

      setWebsites(prev => [data, ...prev]);
      toast({
        title: 'Success',
        description: 'Website added successfully',
      });
      return data as Website;
    } catch (error) {
      console.error('Error adding website:', error);
      toast({
        title: 'Error',
        description: 'Failed to add website',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Update a website
  const updateWebsite = async (id: number, website: WebsiteInput) => {
    try {
      const payload = {
        ...website,
        website_mail: website.website_mail || null,
        mail_password: website.mail_password || null,
        current_mail_service: website.current_mail_service || null,
        previous_mail_service: website.previous_mail_service || null,
        date_created: website.date_created || null,
        termination_date: website.termination_date || null,
        thinktech_server: website.thinktech_server || null,
      };

      const { data, error } = await supabase
        .from('websites')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      let updated: Website | null = data as Website;
      setWebsites(prev => prev.map(w => (w.id !== id ? w : (updated as Website))));
      toast({
        title: 'Success',
        description: 'Website updated successfully',
      });
      return updated;
    } catch (error) {
      console.error('Error updating website:', error);
      toast({
        title: 'Error',
        description: 'Failed to update website',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Delete a website
  const deleteWebsite = async (id: number) => {
    try {
      const { error } = await supabase.from('websites').delete().eq('id', id);
      if (error) throw error;

      setWebsites(prev => prev.filter(w => w.id !== id));
      toast({
        title: 'Success',
        description: 'Website deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting website:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete website',
        variant: 'destructive',
      });
    }
  };

  // Bulk add websites (for CSV import)
  const bulkAddWebsites = async (websitesToAdd: { name: string; url: string }[]) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error('You must be signed in to upload websites.');
      }

      const payload = websitesToAdd.map(site => ({
        name: site.name,
        url: site.url,
        user_id: authData.user.id,
      }));

      const { data, error } = await supabase
        .from('websites')
        .upsert(payload, { onConflict: 'user_id,url' })
        .select('*');

      if (error) throw error;

      const next = (data || []) as Website[];
      setWebsites(prev => {
        const merged = [...next, ...prev.filter(w => !next.some(n => n.id === w.id))];
        return merged;
      });
      return next;
    } catch (error) {
      console.error('Error bulk adding websites:', error);
      throw error;
    }
  };

  // Clear all websites
  const clearAllWebsites = async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error('You must be signed in to clear websites.');
      }

      const { error } = await supabase.from('websites').delete().eq('user_id', authData.user.id);
      if (error) throw error;

      setWebsites([]);
      toast({
        title: 'Success',
        description: 'All websites have been cleared',
      });
    } catch (error) {
      console.error('Error clearing websites:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear websites',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchWebsites();
  }, []);

  return {
    websites,
    isLoading,
    fetchWebsites,
    addWebsite,
    updateWebsite,
    deleteWebsite,
    bulkAddWebsites,
    clearAllWebsites,
  };
};
