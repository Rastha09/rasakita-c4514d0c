import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Loader2, Truck, Store, ChevronRight } from 'lucide-react';
import { CustomerLayout } from '@/components/layouts/CustomerLayout';
import { EmptyState } from '@/components/customer/EmptyState';
import { ThumbnailStack } from '@/components/customer/ProductThumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { fetchProductsByIds } from '@/lib/product-image';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useStoreContext } from '@/lib/store-context';

interface OrderItem {
  product_id: string;
  name: string;
  qty: number;
}

const ONGOING_STATUSES = ['NEW', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP'];
const COMPLETED_STATUSES = ['COMPLETED', 'CANCELED'];

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Pesanan Baru',
  CONFIRMED: 'Dikonfirmasi',
  PROCESSING: 'Diproses',
  OUT_FOR_DELIVERY: 'Dalam Pengiriman',
  READY_FOR_PICKUP: 'Siap Diambil',
  COMPLETED: 'Selesai',
  CANCELED: 'Dibatalkan',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-purple-100 text-purple-700',
  PROCESSING: 'bg-yellow-100 text-yellow-700',
  OUT_FOR_DELIVERY: 'bg-orange-100 text-orange-700',
  READY_FOR_PICKUP: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELED: 'bg-red-100 text-red-700',
};

export default function OrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const { store } = useStoreContext();
  const basePath = `/${storeSlug}`;

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', user?.id, store?.id],
    queryFn: async () => {
      if (!user || !store?.id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', user.id)
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!store?.id,
  });

  // Extract all unique product IDs from all orders
  const allProductIds = useMemo(() => {
    if (!orders) return [];
    const ids = new Set<string>();
    orders.forEach((order) => {
      const items = (order.items as unknown as OrderItem[]) || [];
      items.forEach((item) => ids.add(item.product_id));
    });
    return Array.from(ids);
  }, [orders]);

  // Batch fetch all products for thumbnails
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
    
    return (
      <div
        className="bg-card rounded-2xl p-4 shadow-card cursor-pointer transition-transform active:scale-[0.99]"
        onClick={() => navigate(`${basePath}/orders/${order.id}`)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <ThumbnailStack
              items={items}
              productsMap={productsMap}
              maxVisible={3}
            />
            <div>
              <p className="font-semibold text-sm">{order.order_code}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(order.created_at), 'd MMM yyyy, HH:mm', { locale: localeId })}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={cn('rounded-full', STATUS_COLORS[order.order_status])}>
            {STATUS_LABELS[order.order_status]}
          </Badge>
          <Badge variant="outline" className="rounded-full gap-1">
            {order.shipping_method === 'COURIER' ? (
              <>
                <Truck className="h-3 w-3" /> Kurir
              </>
            ) : (
              <>
                <Store className="h-3 w-3" /> Pickup
              </>
            )}
          </Badge>
        </div>
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-semibold text-primary">
            Rp {order.total.toLocaleString('id-ID')}
          </span>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="px-4 py-4">
        <h1 className="text-xl font-bold mb-4">Pesanan Saya</h1>

        <Tabs defaultValue="ongoing" className="w-full">
          <TabsList className="w-full mb-4 rounded-full bg-muted p-1">
            <TabsTrigger
              value="ongoing"
              className="flex-1 rounded-full data-[state=active]:bg-background"
            >
              Berlangsung ({ongoingOrders.length})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="flex-1 rounded-full data-[state=active]:bg-background"
            >
              Selesai ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ongoing" className="space-y-3">
            {ongoingOrders.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Belum Ada Pesanan"
                description="Pesanan yang sedang berlangsung akan muncul di sini"
                actionLabel="Belanja Sekarang"
                actionLink={basePath}
              />
            ) : (
              ongoingOrders.map((order) => <OrderCard key={order.id} order={order} />)
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-3">
            {completedOrders.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Belum Ada Riwayat"
                description="Pesanan yang sudah selesai atau dibatalkan akan muncul di sini"
              />
            ) : (
              completedOrders.map((order) => <OrderCard key={order.id} order={order} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </CustomerLayout>
  );
}
