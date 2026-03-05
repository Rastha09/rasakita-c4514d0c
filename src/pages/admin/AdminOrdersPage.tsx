import { useState } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingBag, Truck, Store, ChevronDown, ChevronUp, Check, X, Package, MapPin, CheckCircle } from 'lucide-react';
import { useAdminOrders, useUpdateOrderStatus, useAdminDashboardStats, type OrderStatus, type Order } from '@/hooks/useAdminOrders';
import { formatCurrency, formatDateTime } from '@/lib/format-currency';
import { Link, useSearchParams } from 'react-router-dom';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  NEW: { label: 'Baru', variant: 'outline' },
  CONFIRMED: { label: 'Dikonfirmasi', variant: 'default' },
  PROCESSING: { label: 'Diproses', variant: 'secondary' },
  OUT_FOR_DELIVERY: { label: 'Dikirim', variant: 'default' },
  READY_FOR_PICKUP: { label: 'Siap Diambil', variant: 'default' },
  COMPLETED: { label: 'Selesai', variant: 'outline' },
  CANCELED: { label: 'Dibatalkan', variant: 'destructive' },
};

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const updateStatus = useUpdateOrderStatus();
  const address = order.customer_address as Record<string, any> | null;

  const handleProcess = () => {
    const shouldUpdatePayment = order.order_status === 'NEW' && order.payment_method === 'COD';
    updateStatus.mutate({ orderId: order.id, newStatus: 'PROCESSING', updatePayment: shouldUpdatePayment });
  };
  const handleShipped = () => {
    if (order.shipping_method === 'PICKUP') {
      updateStatus.mutate({ orderId: order.id, newStatus: 'READY_FOR_PICKUP' });
    } else {
      updateStatus.mutate({ orderId: order.id, newStatus: 'OUT_FOR_DELIVERY' });
    }
  };
  const handleComplete = () => updateStatus.mutate({ orderId: order.id, newStatus: 'COMPLETED' });
  const handleReject = () => updateStatus.mutate({ orderId: order.id, newStatus: 'CANCELED' });

  const isNew = order.order_status === 'NEW' || order.order_status === 'CONFIRMED';
  const isProcessing = order.order_status === 'PROCESSING';
  const isDelivering = order.order_status === 'OUT_FOR_DELIVERY' || order.order_status === 'READY_FOR_PICKUP';

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header - always visible */}
        <button
          className="w-full p-4 flex items-start justify-between text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-mono text-sm font-semibold">{order.order_code}</p>
              <Badge variant={statusConfig[order.order_status]?.variant || 'outline'} className="text-xs">
                {statusConfig[order.order_status]?.label || order.order_status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                {order.shipping_method === 'PICKUP' ? <Store className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
                {order.shipping_method === 'PICKUP' ? 'Ambil' : 'Kurir'}
              </span>
              <span>{order.payment_method}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="font-bold text-primary">{formatCurrency(order.total)}</p>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>

        {/* Expanded details */}
        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
            {/* Customer info */}
            {address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{address.recipient_name || address.name || 'Pelanggan'}</p>
                  {address.phone && <p className="text-muted-foreground">{address.phone}</p>}
                  {(address.address || address.address_line) && <p className="text-muted-foreground">{address.address || address.address_line}</p>}
                </div>
              </div>
            )}

            {/* Items */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Item Pesanan:</p>
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.name} x{item.qty}</span>
                  <span>{formatCurrency(item.qty * item.price)}</span>
                </div>
              ))}
              {order.shipping_fee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ongkir</span>
                  <span>{formatCurrency(order.shipping_fee)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-sm pt-1 border-t border-border">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(order.total)}</span>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="text-sm">
                <p className="font-medium">Catatan:</p>
                <p className="text-muted-foreground italic">{order.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-1">
              {isNew && (
                <>
                  <Button className="w-full" onClick={handleProcess} disabled={updateStatus.isPending}>
                    <Check className="h-4 w-4 mr-2" /> Terima & Proses
                  </Button>
                  <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive/10" onClick={handleReject} disabled={updateStatus.isPending}>
                    <X className="h-4 w-4 mr-2" /> Tolak Pesanan
                  </Button>
                </>
              )}
              {isProcessing && (
                <Button className="w-full" onClick={handleShipped} disabled={updateStatus.isPending}>
                  <Truck className="h-4 w-4 mr-2" /> 
                  {order.shipping_method === 'PICKUP' ? 'Tandai Siap Diambil' : 'Tandai Dikirim'}
                </Button>
              )}
              {isDelivering && (
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleComplete} disabled={updateStatus.isPending}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Konfirmasi Selesai
                </Button>
              )}
              {!isNew && !isProcessing && !isDelivering && (
                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/admin/orders/${order.id}`}>Lihat Detail</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') as OrderStatus | null;
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>(initialStatus || 'ALL');
  const { data: stats } = useAdminDashboardStats();
  
  const { data: orders, isLoading } = useAdminOrders(
    statusFilter === 'ALL' ? undefined : statusFilter
  );

  const handleTabChange = (value: string) => {
    setStatusFilter(value as OrderStatus | 'ALL');
    if (value === 'ALL') {
      setSearchParams({});
    } else {
      setSearchParams({ status: value });
    }
  };

  const newCount = stats?.newOrders ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Kelola Pesanan</h1>

        <Tabs value={statusFilter} onValueChange={handleTabChange}>
          <ScrollArea className="w-full">
            <TabsList className="w-max flex">
              <TabsTrigger value="ALL">Semua</TabsTrigger>
              <TabsTrigger value="NEW">Baru{newCount > 0 ? ` (${newCount})` : ''}</TabsTrigger>
              <TabsTrigger value="PROCESSING">Diproses</TabsTrigger>
              <TabsTrigger value="OUT_FOR_DELIVERY">Dikirim</TabsTrigger>
              <TabsTrigger value="COMPLETED">Selesai</TabsTrigger>
              <TabsTrigger value="CANCELED">Dibatalkan</TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Tabs>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>)}
          </div>
        ) : orders?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium">Belum ada pesanan</p>
            <p className="text-sm text-muted-foreground">Pesanan dari pelanggan akan muncul di sini</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders?.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}