import { useState } from 'react';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ShoppingBag, Loader2, Search, Store } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/format-currency';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const orderStatusLabels: Record<string, string> = {
  NEW: 'Baru', CONFIRMED: 'Dikonfirmasi', PROCESSING: 'Diproses', OUT_FOR_DELIVERY: 'Dikirim', READY_FOR_PICKUP: 'Siap Diambil', COMPLETED: 'Selesai', CANCELED: 'Dibatalkan',
};
const paymentStatusLabels: Record<string, string> = {
  UNPAID: 'Belum Bayar', PAID: 'Lunas', EXPIRED: 'Kedaluwarsa',
};
const orderStatusVariants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  NEW: 'outline', CONFIRMED: 'default', PROCESSING: 'secondary', OUT_FOR_DELIVERY: 'default', READY_FOR_PICKUP: 'default', COMPLETED: 'default', CANCELED: 'destructive',
};

export default function SuperAdminOrdersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');

  // Fetch orders with store name
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
      }));
    },
  });

  // Get unique stores for filter
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
    const matchesStatus = statusFilter === 'all' || order.order_status === statusFilter;
    const matchesStore = storeFilter === 'all' || order.store_id === storeFilter;
    return matchesSearch && matchesStatus && matchesStore;
  });

  return (
    <SuperAdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">Semua Pesanan</h1>
          <p className="text-sm text-muted-foreground">Overview pesanan seluruh toko</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari kode order..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="NEW">Baru</SelectItem>
              <SelectItem value="CONFIRMED">Dikonfirmasi</SelectItem>
              <SelectItem value="PROCESSING">Diproses</SelectItem>
              <SelectItem value="OUT_FOR_DELIVERY">Dikirim</SelectItem>
              <SelectItem value="COMPLETED">Selesai</SelectItem>
              <SelectItem value="CANCELED">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
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
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
                  <TableRow key={order.id}>
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
    </SuperAdminLayout>
  );
}