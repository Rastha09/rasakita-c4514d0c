import { useState } from 'react';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShoppingBag, Loader2, Search } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/format-currency';

const orderStatusLabels: Record<string, string> = {
  NEW: 'Baru',
  PAID: 'Dibayar',
  PROCESSING: 'Diproses',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

const paymentStatusLabels: Record<string, string> = {
  UNPAID: 'Belum Bayar',
  PAID: 'Lunas',
  EXPIRED: 'Kedaluwarsa',
};

const orderStatusVariants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  NEW: 'outline',
  PAID: 'default',
  PROCESSING: 'secondary',
  COMPLETED: 'default',
  CANCELLED: 'destructive',
};

export default function SuperAdminOrdersPage() {
  const { orders, ordersLoading, stores } = useSuperAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.order_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStore = storeFilter === 'all' || order.store_id === storeFilter;
    const matchesStatus = statusFilter === 'all' || order.order_status === statusFilter;
    return matchesSearch && matchesStore && matchesStatus;
  });

  return (
    <SuperAdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold">Semua Pesanan</h1>
          <p className="text-sm text-muted-foreground">Overview pesanan dari semua toko</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari kode order..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Semua Toko" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Toko</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="NEW">Baru</SelectItem>
              <SelectItem value="PAID">Dibayar</SelectItem>
              <SelectItem value="PROCESSING">Diproses</SelectItem>
              <SelectItem value="COMPLETED">Selesai</SelectItem>
              <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orders Table */}
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
                  <TableHead className="hidden md:table-cell">Toko</TableHead>
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
                      <div>
                        <p className="font-mono font-medium">{order.order_code}</p>
                        <p className="text-xs text-muted-foreground md:hidden">
                          {(order.store as { name: string })?.name || '-'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {(order.store as { name: string })?.name || '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(order.total)}
                    </TableCell>
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
