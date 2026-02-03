import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Store {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  logo_path: string | null;
  banner_path: string | null;
  theme_color: string | null;
  is_active: boolean;
  created_at: string;
}

export function useStore(slug: string | undefined) {
  return useQuery({
    queryKey: ['store', slug],
    queryFn: async () => {
      if (!slug) return null;
      
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - store not found
          return null;
        }
        throw error;
      }
      return data as Store;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useStoreBySlug(slug: string | undefined) {
  return useStore(slug);
}
