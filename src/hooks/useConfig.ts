import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import type { ConfigApiResponse } from '@/types/config';

export function useConfig() {
  const { user } = useAuth();
  const [config, setConfig] = useState<ConfigApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setConfig(null);
      setIsLoading(false);
      return;
    }

    const fetchConfig = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/config?userId=${user.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch configuration');
        }

        const data = await response.json();
        setConfig(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching config:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setConfig(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [user?.id]);

  return { config, isLoading, error };
}