import { useState, useEffect } from 'react';
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

  const storageKey = 'sentinel:websites';

  const loadFromStorage = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as Website[]) : [];
      const next = Array.isArray(parsed) ? parsed : [];
      setWebsites(next);
      return next;
    } catch (error) {
      console.error('Error loading websites from storage:', error);
      setWebsites([]);
      return [];
    }
  };

  const saveToStorage = (next: Website[]) => {
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  // Fetch all websites
  const fetchWebsites = async () => {
    setIsLoading(true);
    try {
      loadFromStorage();
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
      const data: Website = {
        id: Date.now(),
        name,
        url,
        created_at: new Date().toISOString(),
      };
      setWebsites(prev => {
        const next = [data, ...prev];
        saveToStorage(next);
        return next;
      });
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
      let updated: Website | null = null;
      setWebsites(prev => {
        const next = prev.map(w => {
          if (w.id !== id) return w;
          updated = { ...w, name, url };
          return updated;
        });
        saveToStorage(next);
        return next;
      });
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
      setWebsites(prev => {
        const next = prev.filter(w => w.id !== id);
        saveToStorage(next);
        return next;
      });
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
      const data: Website[] = websitesToAdd.map((site, index) => ({
        id: Date.now() + index,
        name: site.name,
        url: site.url,
        created_at: new Date().toISOString(),
      }));
      setWebsites(prev => {
        const next = [...data, ...prev];
        saveToStorage(next);
        return next;
      });
      return data;
    } catch (error) {
      console.error('Error bulk adding websites:', error);
      throw error;
    }
  };

  // Clear all websites
  const clearAllWebsites = async () => {
    try {
      setWebsites(() => {
        const next: Website[] = [];
        saveToStorage(next);
        return next;
      });
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
