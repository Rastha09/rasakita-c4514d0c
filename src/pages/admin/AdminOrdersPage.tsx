import { useState } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ShoppingBag, Truck, Store } from 'lucide-react';
import { useAdminOrders, type OrderStatus } from '@/hooks/useAdminOrders';
import { formatCurrency, formatDateTime } from '@/lib/format-currency';
import { Link, useSearchParams } from 'react-router-dom';

const statusConfig: Record<OrderStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  NEW: { label: 'Baru', variant: 'outline' },
  PAID: { label: 'Dibayar', variant: 'default' },
  PROCESSING: { label: 'Diproses', variant: 'secondary' },
  COMPLETED: { label: 'Selesai', variant: 'outline' },
  CANCELLED: { label: 'Dibatalkan', variant: 'destructive' },
};

export default function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') as OrderStatus | null;
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>(initialStatus || 'ALL');
  
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

  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Pesanan</h1>

        <Tabs value={statusFilter} onValueChange={handleTabChange}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="ALL">Semua</TabsTrigger>
            <TabsTrigger value="PAID">Baru</TabsTrigger>
            <TabsTrigger value="PROCESSING">Proses</TabsTrigger>
            <TabsTrigger value="COMPLETED">Selesai</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : orders?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Belum ada pesanan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders?.map((order) => (
              <Link key={order.id} to={`/admin/orders/${order.id}`}>
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-mono text-sm font-semibold">{order.order_code}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(order.created_at)}
                        </p>
                      </div>
                      <Badge variant={statusConfig[order.order_status]?.variant || 'outline'}>
                        {statusConfig[order.order_status]?.label || order.order_status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {order.shipping_method === 'PICKUP' ? (
                            <Store className="h-3.5 w-3.5" />
                          ) : (
                            <Truck className="h-3.5 w-3.5" />
                          )}
                          {order.shipping_method === 'PICKUP' ? 'Ambil' : 'Kurir'}
                        </span>
                        <span>{order.payment_method}</span>
                      </div>
                      <p className="font-semibold">{formatCurrency(order.total)}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
