import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, ShoppingBag, Clock, TrendingUp, ArrowRight, Loader2 } from 'lucide-react';
import { useAdminDashboardStats } from '@/hooks/useAdminOrders';
import { formatCurrency } from '@/lib/format-currency';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const { data: stats, isLoading } = useAdminDashboardStats();

  const dashboardStats = [
    { 
      label: 'Order Baru', 
      value: stats?.newOrders ?? 0, 
      icon: ShoppingBag, 
      color: 'bg-primary',
      description: 'Menunggu diproses'
    },
    { 
      label: 'Diproses', 
      value: stats?.processing ?? 0, 
      icon: Clock, 
      color: 'bg-warning',
      description: 'Sedang disiapkan'
    },
    { 
      label: 'Selesai Hari Ini', 
      value: stats?.completedToday ?? 0, 
      icon: Package, 
      color: 'bg-success',
      description: 'Pesanan terkirim'
    },
    { 
      label: 'Pendapatan Hari Ini', 
      value: formatCurrency(stats?.revenueToday ?? 0), 
      icon: TrendingUp, 
      color: 'bg-accent',
      description: 'Total penjualan'
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                    <p className="text-2xl font-bold">{stat.value}</p>
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
                      <Link to="/admin/orders?status=PAID">
                        Lihat <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
