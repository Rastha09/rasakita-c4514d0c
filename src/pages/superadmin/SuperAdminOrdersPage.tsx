import { useState } from 'react';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ShoppingBag, Loader2, Search, Store, MapPin, Truck, Banknote } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/format-currency';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const orderStatusLabels: Record<string, string> = {
  PENDING_PAYMENT: 'Belum Bayar', NEW: 'Baru', CONFIRMED: 'Dikonfirmasi', PROCESSING: 'Diproses', OUT_FOR_DELIVERY: 'Dikirim', READY_FOR_PICKUP: 'Siap Diambil', COMPLETED: 'Selesai', CANCELED: 'Dibatalkan',
};
const paymentStatusLabels: Record<string, string> = {
  UNPAID: 'Belum Bayar', PAID: 'Lunas', EXPIRED: 'Kedaluwarsa', FAILED: 'Gagal', REFUNDED: 'Refund',
};
const orderStatusColors: Record<string, string> = {
  PENDING_PAYMENT: 'bg-amber-100 text-amber-700', NEW: 'bg-blue-100 text-blue-700', CONFIRMED: 'bg-purple-100 text-purple-700', PROCESSING: 'bg-orange-100 text-orange-700', OUT_FOR_DELIVERY: 'bg-violet-100 text-violet-700', READY_FOR_PICKUP: 'bg-green-100 text-green-700', COMPLETED: 'bg-green-100 text-green-700', CANCELED: 'bg-red-100 text-red-700',
};

export default function SuperAdminOrdersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['sa-orders-with-store'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, stores(name)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []).map(o => ({
        ...o,
        storeName: (o.stores as any)?.name || '-',
        items: Array.isArray(o.items) ? o.items as any[] : [],
      }));
    },
  });

  const { data: stores } = useQuery({
    queryKey: ['sa-stores-list'],
    queryFn: async () => {
      const { data } = await supabase.from('stores').select('id, name').order('name');
      return data || [];
    },
  });

  const orders = ordersData || [];

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.order_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || order.order_status === statusFilter;
    const matchesStore = storeFilter === 'all' || order.store_id === storeFilter;
    return matchesSearch && matchesStatus && matchesStore;
  });

  return (
    <SuperAdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">Semua Pesanan</h1>
          <p className="text-sm text-muted-foreground">Overview pesanan seluruh toko (read-only)</p>
        </div>

        {/* Filter Tabs */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <ScrollArea className="w-full">
            <TabsList className="w-max flex">
              <TabsTrigger value="ALL">Semua</TabsTrigger>
              <TabsTrigger value="NEW">Baru</TabsTrigger>
              <TabsTrigger value="PROCESSING">Diproses</TabsTrigger>
              <TabsTrigger value="OUT_FOR_DELIVERY">Dikirim</TabsTrigger>
              <TabsTrigger value="COMPLETED">Selesai</TabsTrigger>
              <TabsTrigger value="CANCELED">Dibatalkan</TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Tabs>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari kode order..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Semua Toko" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Toko</SelectItem>
              {stores?.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {ordersLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <ShoppingBag className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                {orders.length === 0 ? 'Belum ada pesanan' : 'Tidak ada pesanan yang cocok'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Pembayaran</TableHead>
                  <TableHead className="hidden lg:table-cell">Tanggal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow 
                    key={order.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <TableCell>
                      <p className="font-mono font-medium">{order.order_code}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Store className="h-3 w-3" /> {order.storeName}
                      </p>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                      <Badge variant={orderStatusVariants[order.order_status] || 'outline'}>
                        {orderStatusLabels[order.order_status] || order.order_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={order.payment_status === 'PAID' ? 'default' : 'outline'}>
                        {paymentStatusLabels[order.payment_status] || order.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {formatDateTime(order.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Order Detail Dialog (read-only) */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedOrder?.order_code}
              <Badge variant={orderStatusVariants[selectedOrder?.order_status] || 'outline'} className="text-xs">
                {orderStatusLabels[selectedOrder?.order_status] || selectedOrder?.order_status}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              {/* Store & Date */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Store className="h-4 w-4" />
                <span>{selectedOrder.storeName}</span>
                <span>•</span>
                <span>{formatDateTime(selectedOrder.created_at)}</span>
              </div>

              {/* Customer */}
              {selectedOrder.customer_address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">
                      {(selectedOrder.customer_address as any)?.recipient_name || 
                       (selectedOrder.customer_address as any)?.name || 'Pelanggan'}
                    </p>
                    {(selectedOrder.customer_address as any)?.phone && (
                      <p className="text-muted-foreground">{(selectedOrder.customer_address as any).phone}</p>
                    )}
                    {((selectedOrder.customer_address as any)?.address || (selectedOrder.customer_address as any)?.address_line) && (
                      <p className="text-muted-foreground">
                        {(selectedOrder.customer_address as any).address || (selectedOrder.customer_address as any).address_line}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Shipping & Payment */}
              <div className="flex gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  {selectedOrder.shipping_method === 'PICKUP' ? <Store className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                  <span>{selectedOrder.shipping_method === 'PICKUP' ? 'Ambil' : 'Kurir'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Banknote className="h-4 w-4" />
                  <span>{selectedOrder.payment_method}</span>
                </div>
                <Badge variant={selectedOrder.payment_status === 'PAID' ? 'default' : 'outline'} className="text-xs">
                  {paymentStatusLabels[selectedOrder.payment_status] || selectedOrder.payment_status}
                </Badge>
              </div>

              {/* Items */}
              <div className="border-t border-border pt-3 space-y-2">
                <p className="text-sm font-medium">Item Pesanan</p>
                {selectedOrder.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name} x{item.qty}</span>
                    <span>{formatCurrency((item.qty || 1) * (item.price || 0))}</span>
                  </div>
                ))}
                {selectedOrder.shipping_fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ongkir</span>
                    <span>{formatCurrency(selectedOrder.shipping_fee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-sm pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="text-sm border-t border-border pt-3">
                  <p className="font-medium">Catatan:</p>
                  <p className="text-muted-foreground italic">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}