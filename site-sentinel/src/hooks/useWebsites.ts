import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Website {
  id: number;
  name: string;
  url: string;
  created_at: string;
}

export const useWebsites = () => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch all websites
  const fetchWebsites = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('websites')
        .select('*')
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
  const addWebsite = async (name: string, url: string) => {
    try {
      const { data, error } = await supabase
        .from('websites')
        .insert([{ name, url }])
        .select()
        .single();

      if (error) throw error;
      
      setWebsites(prev => [data, ...prev]);
      toast({
        title: 'Success',
        description: 'Website added successfully',
      });
      return data;
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
  const updateWebsite = async (id: number, name: string, url: string) => {
    try {
      const { data, error } = await supabase
        .from('websites')
        .update({ name, url })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setWebsites(prev => prev.map(w => w.id === id ? data : w));
      toast({
        title: 'Success',
        description: 'Website updated successfully',
      });
      return data;
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
      const { error } = await supabase
        .from('websites')
        .delete()
        .eq('id', id);

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
      const { data, error } = await supabase
        .from('websites')
        .insert(websitesToAdd)
        .select();

      if (error) throw error;

      setWebsites(prev => [...data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error bulk adding websites:', error);
      throw error;
    }
  };

  // Clear all websites
  const clearAllWebsites = async () => {
    try {
      const { error } = await supabase
        .from('websites')
        .delete()
        .neq('id', 0); // Delete all records

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
