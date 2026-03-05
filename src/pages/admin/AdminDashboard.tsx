import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, ShoppingBag, Clock, TrendingUp, ArrowRight, AlertTriangle, Check, X, Store, Truck } from 'lucide-react';
import { useAdminDashboardStats, useAdminOrders, useUpdateOrderStatus } from '@/hooks/useAdminOrders';
import { useAdminProducts } from '@/hooks/useAdminProducts';
import { useAuth } from '@/lib/auth';
import { formatCurrency, formatDateTime } from '@/lib/format-currency';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const { data: stats, isLoading } = useAdminDashboardStats();
  const { data: recentOrders, isLoading: ordersLoading } = useAdminOrders();
  const { data: products } = useAdminProducts();
  const updateStatus = useUpdateOrderStatus();
  const { profile } = useAuth();

  const outOfStockProducts = products?.filter(p => p.stock === 0 && p.is_active) || [];

  const dashboardStats = [
    { label: 'Order Baru', value: stats?.newOrders ?? 0, icon: ShoppingBag, color: 'bg-primary', description: 'Menunggu diproses' },
    { label: 'Diproses', value: stats?.processing ?? 0, icon: Clock, color: 'bg-warning', description: 'Sedang disiapkan' },
    { label: 'Selesai Hari Ini', value: stats?.completedToday ?? 0, icon: Package, color: 'bg-success', description: 'Pesanan terkirim' },
    { label: 'Pendapatan Hari Ini', value: formatCurrency(stats?.revenueToday ?? 0), icon: TrendingUp, color: 'bg-accent', description: 'Total penjualan', isText: true },
  ];

  const last3Orders = recentOrders
    ?.filter(o => o.order_status === 'NEW' || o.order_status === 'CONFIRMED')
    .slice(0, 3) || [];

  const handleProcess = (orderId: string, paymentMethod: string, orderStatus: string) => {
    const shouldUpdatePayment = orderStatus === 'NEW' && paymentMethod === 'COD';
    updateStatus.mutate({ orderId, newStatus: 'PROCESSING', updatePayment: shouldUpdatePayment });
  };

  const handleReject = (orderId: string) => {
    updateStatus.mutate({ orderId, newStatus: 'CANCELED' });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="gradient-primary rounded-2xl p-5 text-primary-foreground">
          <h1 className="text-xl font-bold">Selamat Datang, {profile?.full_name || 'Admin'}! 👋</h1>
          <p className="text-sm opacity-90 mt-1">Admin Panel • Kelola toko Anda</p>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1,2,3,4].map(i => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              {dashboardStats.map((stat) => (
                <Card key={stat.label}>
                  <CardHeader className="pb-2">
                    <div className={`h-10 w-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                      <stat.icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{stat.isText ? stat.value : (stat.value as number).toLocaleString('id-ID')}</p>
                    <p className="text-sm font-medium">{stat.label}</p>
                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {(stats?.newOrders ?? 0) > 0 && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Ada {stats?.newOrders} pesanan baru!</p>
                      <p className="text-sm text-muted-foreground">Segera proses pesanan pelanggan</p>
                    </div>
                    <Button asChild>
                      <Link to="/admin/orders?status=NEW">
                        Lihat <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Out of Stock Warning */}
            {outOfStockProducts.length > 0 && (
              <Card className="border-warning/30 bg-warning/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-warning" />
                      <div>
                        <p className="font-semibold">⚠️ {outOfStockProducts.length} produk stok habis</p>
                        <p className="text-sm text-muted-foreground">Segera tambah stok produk</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/admin/products">Kelola <ArrowRight className="ml-1 h-3 w-3" /></Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Orders */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold">Pesanan Terbaru</h2>
                <Link to="/admin/orders" className="text-sm text-primary font-medium flex items-center gap-1">
                  Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {ordersLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
                </div>
              ) : last3Orders.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Belum ada pesanan baru</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {last3Orders.map((order) => (
                    <Card key={order.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-mono text-sm font-semibold">{order.order_code}</p>
                            <p className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
                          </div>
                          <div className="flex gap-1.5">
                            <Badge variant="default" className="text-xs">Pesanan Baru</Badge>
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              {order.shipping_method === 'PICKUP' ? <Store className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
                              {order.shipping_method === 'PICKUP' ? 'Ambil' : 'Kurir'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-lg font-bold text-primary">{formatCurrency(order.total)}</p>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleProcess(order.id, order.payment_method, order.order_status)}
                              disabled={updateStatus.isPending}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" /> Proses
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-destructive text-destructive hover:bg-destructive/10"
                              onClick={() => handleReject(order.id)}
                              disabled={updateStatus.isPending}
                            >
                              <X className="h-3.5 w-3.5 mr-1" /> Tolak
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}