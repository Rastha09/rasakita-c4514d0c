import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER';
  store_id: string | null;
  created_at: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalGMV: number;
  newOrders: number;
  processing: number;
}

export function useSuperAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dashboard Stats
  const statsQuery = useQuery({
    queryKey: ['superadmin-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const [usersRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('total, payment_status, order_status'),
      ]);

      const allOrders = ordersRes.data || [];
      const paidOrders = allOrders.filter(o => o.payment_status === 'PAID');
      const totalGMV = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const newOrders = allOrders.filter(o => o.order_status === 'NEW' || o.order_status === 'PAID').length;
      const processing = allOrders.filter(o => o.order_status === 'PROCESSING').length;

      return {
        totalUsers: usersRes.count || 0,
        totalOrders: allOrders.length,
        totalGMV,
        newOrders,
        processing,
      };
    },
  });

  // Users (profiles)
  const usersQuery = useQuery({
    queryKey: ['superadmin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Profile[];
    },
  });

  // Store Admins
  const storeAdminsQuery = useQuery({
    queryKey: ['superadmin-store-admins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_admins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Assign admin (add to store_admins for the single store)
  const assignStoreAdmin = useMutation({
    mutationFn: async ({ user_id, store_id }: { user_id: string; store_id: string }) => {
      const { data, error } = await supabase
        .from('store_admins')
        .insert({ user_id, store_id, role: 'STORE_ADMIN' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-store-admins'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-users'] });
      toast({ title: 'Admin berhasil ditambahkan' });
    },
    onError: (error) => {
      toast({ title: 'Gagal menambah admin', description: error.message, variant: 'destructive' });
    },
  });

  // Remove admin
  const removeStoreAdmin = useMutation({
    mutationFn: async ({ user_id, store_id }: { user_id: string; store_id: string }) => {
      const { error } = await supabase
        .from('store_admins')
        .delete()
        .eq('user_id', user_id)
        .eq('store_id', store_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-store-admins'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-users'] });
      toast({ title: 'Admin berhasil dihapus' });
    },
    onError: (error) => {
      toast({ title: 'Gagal hapus admin', description: error.message, variant: 'destructive' });
    },
  });

  // Update user role
  const updateUserRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: Profile['role'] }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
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
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  return {
    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,
    users: usersQuery.data || [],
    usersLoading: usersQuery.isLoading,
    updateUserRole,
    storeAdmins: storeAdminsQuery.data || [],
    storeAdminsLoading: storeAdminsQuery.isLoading,
    assignStoreAdmin,
    removeStoreAdmin,
    orders: ordersQuery.data || [],
    ordersLoading: ordersQuery.isLoading,
  };
}
