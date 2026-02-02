import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER';
  store_id: string | null;
  created_at: string;
  store?: Store | null;
}

export interface DashboardStats {
  totalStores: number;
  totalUsers: number;
  totalOrders: number;
  totalGMV: number;
}

export function useSuperAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dashboard Stats
  const statsQuery = useQuery({
    queryKey: ['superadmin-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const [storesRes, usersRes, ordersRes] = await Promise.all([
        supabase.from('stores').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('total, payment_status'),
      ]);

      const paidOrders = ordersRes.data?.filter(o => o.payment_status === 'PAID') || [];
      const totalGMV = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);

      return {
        totalStores: storesRes.count || 0,
        totalUsers: usersRes.count || 0,
        totalOrders: ordersRes.data?.length || 0,
        totalGMV,
      };
    },
  });

  // Stores
  const storesQuery = useQuery({
    queryKey: ['superadmin-stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Store[];
    },
  });

  const createStore = useMutation({
    mutationFn: async (store: { name: string; slug: string; address?: string }) => {
      const { data, error } = await supabase
        .from('stores')
        .insert(store)
        .select()
        .single();

      if (error) throw error;

      // Create default store_settings
      await supabase.from('store_settings').insert({ store_id: data.id });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-stores'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-stats'] });
      toast({ title: 'Toko berhasil ditambahkan' });
    },
    onError: (error) => {
      toast({ title: 'Gagal menambah toko', description: error.message, variant: 'destructive' });
    },
  });

  const updateStore = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Store> & { id: string }) => {
      const { data, error } = await supabase
        .from('stores')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-stores'] });
      toast({ title: 'Toko berhasil diperbarui' });
    },
    onError: (error) => {
      toast({ title: 'Gagal memperbarui toko', description: error.message, variant: 'destructive' });
    },
  });

  const toggleStoreActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('stores')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-stores'] });
      toast({ title: variables.is_active ? 'Toko diaktifkan' : 'Toko dinonaktifkan' });
    },
    onError: (error) => {
      toast({ title: 'Gagal mengubah status toko', description: error.message, variant: 'destructive' });
    },
  });

  // Users
  const usersQuery = useQuery({
    queryKey: ['superadmin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          store:stores(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Profile[];
    },
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ id, role, store_id }: { id: string; role: Profile['role']; store_id?: string | null }) => {
      const updates: Partial<Profile> = { role };
      if (role === 'ADMIN' && store_id) {
        updates.store_id = store_id;
      } else if (role !== 'ADMIN') {
        updates.store_id = null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-users'] });
      toast({ title: 'Role user berhasil diperbarui' });
    },
    onError: (error) => {
      toast({ title: 'Gagal mengubah role', description: error.message, variant: 'destructive' });
    },
  });

  // Orders
  const ordersQuery = useQuery({
    queryKey: ['superadmin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          store:stores(id, name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  return {
    // Stats
    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,
    
    // Stores
    stores: storesQuery.data || [],
    storesLoading: storesQuery.isLoading,
    createStore,
    updateStore,
    toggleStoreActive,
    
    // Users
    users: usersQuery.data || [],
    usersLoading: usersQuery.isLoading,
    updateUserRole,
    
    // Orders
    orders: ordersQuery.data || [],
    ordersLoading: ordersQuery.isLoading,
  };
}
