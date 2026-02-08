import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export type OrderStatus = 'NEW' | 'PAID' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'FAILED';

export interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  qty: number;
  notes?: string;
}

export interface Order {
  id: string;
  order_code: string;
  store_id: string;
  customer_id: string | null;
  items: OrderItem[];
  subtotal: number;
  shipping_fee: number;
  total: number;
  shipping_method: string;
  payment_method: string;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  notes: string | null;
  customer_address: Record<string, unknown> | null;
  created_at: string;
}

export function useAdminOrders(statusFilter?: OrderStatus) {
  const { storeAdmin } = useAuth();
  const storeId = storeAdmin?.store_id;

  return useQuery({
    queryKey: ['admin-orders', storeId, statusFilter],
    queryFn: async () => {
      if (!storeId) return [];

      let query = supabase
        .from('orders')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('order_status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(o => ({
        ...o,
        items: (Array.isArray(o.items) ? o.items : []) as unknown as OrderItem[],
        customer_address: o.customer_address as Record<string, unknown> | null,
        order_status: o.order_status as OrderStatus,
        payment_status: o.payment_status as PaymentStatus,
      })) as Order[];
    },
    enabled: !!storeId,
  });
}

export function useAdminOrderDetail(orderId: string) {
  const { storeAdmin } = useAuth();
  const storeId = storeAdmin?.store_id;

  return useQuery({
    queryKey: ['admin-order', orderId],
    queryFn: async () => {
      if (!storeId || !orderId) return null;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('store_id', storeId)
        .single();

      if (error) throw error;
      return {
        ...data,
        items: (Array.isArray(data.items) ? data.items : []) as unknown as OrderItem[],
        customer_address: data.customer_address as Record<string, unknown> | null,
        order_status: data.order_status as OrderStatus,
        payment_status: data.payment_status as PaymentStatus,
      } as Order;
    },
    enabled: !!storeId && !!orderId,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ orderId, newStatus, updatePayment }: { orderId: string; newStatus: OrderStatus; updatePayment?: boolean }) => {
      const updateData: { order_status: OrderStatus; payment_status?: string } = { 
        order_status: newStatus 
      };
      
      // If updating to PROCESSING and this is a COD order, also mark as PAID
      if (updatePayment) {
        updateData.payment_status = 'PAID';
      }
      
      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-order'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      toast({
        title: 'Status diperbarui',
        description: 'Status pesanan berhasil diperbarui',
      });
    },
    onError: (error) => {
      toast({
        title: 'Gagal memperbarui',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAdminDashboardStats() {
  const { storeAdmin } = useAuth();
  const storeId = storeAdmin?.store_id;

  return useQuery({
    queryKey: ['admin-dashboard', storeId],
    queryFn: async () => {
      if (!storeId) {
        return { newOrders: 0, processing: 0, completedToday: 0, revenueToday: 0 };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch all orders for this store
      const { data: orders, error } = await supabase
        .from('orders')
        .select('order_status, payment_status, total, created_at')
        .eq('store_id', storeId);

      if (error) throw error;

      const allOrders = orders || [];

      // Calculate stats - NEW and PAID both count as new orders
      const newOrders = allOrders.filter(o => o.order_status === 'NEW' || o.order_status === 'PAID').length;
      const processing = allOrders.filter(o => o.order_status === 'PROCESSING').length;
      
      const completedToday = allOrders.filter(o => 
        o.order_status === 'COMPLETED' && 
        new Date(o.created_at) >= today
      ).length;

      const revenueToday = allOrders
        .filter(o => 
          (o.order_status === 'COMPLETED' || o.payment_status === 'PAID') && 
          new Date(o.created_at) >= today
        )
        .reduce((sum, o) => sum + o.total, 0);

      return { newOrders, processing, completedToday, revenueToday };
    },
    enabled: !!storeId,
  });
}
