import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Loader2, Truck, Store, ChevronRight, Clock, CreditCard } from 'lucide-react';
import { CustomerLayout } from '@/components/layouts/CustomerLayout';
import { EmptyState } from '@/components/customer/EmptyState';
import { ThumbnailStack } from '@/components/customer/ProductThumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { fetchProductsByIds } from '@/lib/product-image';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useStoreContext } from '@/lib/store-context';

interface OrderItem { product_id: string; name: string; qty: number; }

const ONGOING_STATUSES = ['PENDING_PAYMENT', 'NEW', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP'];
const COMPLETED_STATUSES = ['COMPLETED', 'CANCELED'];

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Menunggu Pembayaran',
  NEW: 'Pesanan Baru',
  CONFIRMED: 'Dikonfirmasi',
  PROCESSING: 'Diproses',
  OUT_FOR_DELIVERY: 'Dalam Pengiriman',
  READY_FOR_PICKUP: 'Siap Diambil',
  COMPLETED: 'Selesai',
  CANCELED: 'Dibatalkan',
};
const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: 'bg-amber-100 text-amber-700',
  NEW: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-purple-100 text-purple-700',
  PROCESSING: 'bg-orange-100 text-orange-700',
  OUT_FOR_DELIVERY: 'bg-violet-100 text-violet-700',
  READY_FOR_PICKUP: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELED: 'bg-red-100 text-red-700',
};

function PaymentCountdown({ expiredAt }: { expiredAt: string }) {
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const expiry = new Date(expiredAt).getTime();
      const diff = expiry - now;
      if (diff <= 0) { setCountdown('Kedaluwarsa'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiredAt]);

  return (
    <span className="text-xs font-mono font-semibold text-amber-700">{countdown}</span>
  );
}

export default function OrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { store } = useStoreContext();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', user?.id, store?.id],
    queryFn: async () => {
      if (!user || !store?.id) return [];
      const { data, error } = await supabase.from('orders').select('*').eq('customer_id', user.id).eq('store_id', store.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!store?.id,
    refetchInterval: 10000, // Poll every 10s for status updates
  });

  // Fetch payment data for pending orders
  const pendingOrderIds = useMemo(() => 
    orders?.filter(o => o.order_status === 'PENDING_PAYMENT').map(o => o.id) || [], 
    [orders]
  );

  const { data: paymentsMap } = useQuery({
    queryKey: ['orders-payments', pendingOrderIds],
    queryFn: async () => {
      if (pendingOrderIds.length === 0) return new Map<string, any>();
      const { data } = await supabase
        .from('payments')
        .select('*')
        .in('order_id', pendingOrderIds)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });
      const map = new Map<string, any>();
      data?.forEach(p => { if (!map.has(p.order_id)) map.set(p.order_id, p); });
      return map;
    },
    enabled: pendingOrderIds.length > 0,
    refetchInterval: 10000,
  });

  const allProductIds = useMemo(() => {
    if (!orders) return [];
    const ids = new Set<string>();
    orders.forEach((order) => { const items = (order.items as unknown as OrderItem[]) || []; items.forEach((item) => ids.add(item.product_id)); });
    return Array.from(ids);
  }, [orders]);

  const { data: productsMap } = useQuery({
    queryKey: ['orders-products', allProductIds],
    queryFn: () => fetchProductsByIds(allProductIds),
    enabled: allProductIds.length > 0,
  });

  const ongoingOrders = orders?.filter((o) => ONGOING_STATUSES.includes(o.order_status)) || [];
  const completedOrders = orders?.filter((o) => COMPLETED_STATUSES.includes(o.order_status)) || [];

  const OrderCard = ({ order }: { order: typeof orders extends (infer T)[] | undefined ? T : never }) => {
    if (!order) return null;
    const items = (order.items as unknown as OrderItem[]) || [];
    const isPendingPayment = order.order_status === 'PENDING_PAYMENT';
    const payment = paymentsMap?.get(order.id);

    return (
      <div className="bg-card rounded-2xl p-4 shadow-card cursor-pointer transition-transform active:scale-[0.99]" onClick={() => isPendingPayment ? navigate(`/payment/${order.id}`) : navigate(`/orders/${order.id}`)}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <ThumbnailStack items={items} productsMap={productsMap} maxVisible={3} />
            <div>
              <p className="font-semibold text-sm">{order.order_code}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), 'd MMM yyyy, HH:mm', { locale: localeId })}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={cn('rounded-full', STATUS_COLORS[order.order_status])}>{STATUS_LABELS[order.order_status]}</Badge>
          <Badge variant="outline" className="rounded-full gap-1">
            {order.shipping_method === 'COURIER' ? (<><Truck className="h-3 w-3" /> Kurir</>) : (<><Store className="h-3 w-3" /> Pickup</>)}
          </Badge>
        </div>

        {/* Pending payment: countdown + pay button */}
        {isPendingPayment && payment?.expired_at && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs text-muted-foreground">Bayar sebelum</span>
              </div>
              <PaymentCountdown expiredAt={payment.expired_at} />
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                className="flex-1 rounded-full h-9 text-xs font-semibold"
                onClick={(e) => { e.stopPropagation(); navigate(`/payment/${order.id}`); }}
              >
                <CreditCard className="h-3.5 w-3.5 mr-1" /> Bayar Sekarang
              </Button>
            </div>
          </div>
        )}

        {!isPendingPayment && (
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-semibold text-primary">Rp {order.total.toLocaleString('id-ID')}</span>
          </div>
        )}

        {isPendingPayment && !payment?.expired_at && (
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-semibold text-primary">Rp {order.total.toLocaleString('id-ID')}</span>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (<CustomerLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></CustomerLayout>);
  }

  return (
    <CustomerLayout>
      <div className="px-4 py-4">
        <h1 className="text-xl font-bold mb-4">Pesanan Saya</h1>
        <Tabs defaultValue="ongoing" className="w-full">
          <TabsList className="w-full mb-4 rounded-full bg-muted p-1">
            <TabsTrigger value="ongoing" className="flex-1 rounded-full data-[state=active]:bg-background">Berlangsung ({ongoingOrders.length})</TabsTrigger>
            <TabsTrigger value="completed" className="flex-1 rounded-full data-[state=active]:bg-background">Selesai ({completedOrders.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="ongoing" className="space-y-3">
            {ongoingOrders.length === 0 ? (<EmptyState icon={ClipboardList} title="Belum Ada Pesanan" description="Pesanan yang sedang berlangsung akan muncul di sini" actionLabel="Belanja Sekarang" actionLink="/" />) : (ongoingOrders.map((order) => <OrderCard key={order.id} order={order} />))}
          </TabsContent>
          <TabsContent value="completed" className="space-y-3">
            {completedOrders.length === 0 ? (<EmptyState icon={ClipboardList} title="Belum Ada Riwayat" description="Pesanan yang sudah selesai atau dibatalkan akan muncul di sini" />) : (completedOrders.map((order) => <OrderCard key={order.id} order={order} />))}
          </TabsContent>
        </Tabs>
      </div>
    </CustomerLayout>
  );
}
