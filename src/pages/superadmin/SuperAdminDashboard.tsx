import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Users, ShoppingBag, TrendingUp, Clock, Package, Loader2 } from 'lucide-react';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { formatCurrency } from '@/lib/format-currency';

export default function SuperAdminDashboard() {
  const { stats, statsLoading } = useSuperAdmin();

  const statCards = [
    { label: 'Total User', value: stats?.totalUsers || 0, icon: Users, color: 'bg-blue-500' },
    { label: 'Order Baru', value: stats?.newOrders || 0, icon: ShoppingBag, color: 'bg-primary' },
    { label: 'Diproses', value: stats?.processing || 0, icon: Clock, color: 'bg-amber-500' },
    { label: 'Total Pesanan', value: stats?.totalOrders || 0, icon: Package, color: 'bg-emerald-500' },
    { label: 'GMV', value: formatCurrency(stats?.totalGMV || 0), icon: TrendingUp, color: 'bg-green-500', isText: true },
  ];

  return (
    <SuperAdminLayout>
      <h1 className="text-2xl font-bold mb-6">Dashboard Super Admin</h1>
      
      {statsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <div className={`h-10 w-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {stat.isText ? stat.value : (stat.value as number).toLocaleString('id-ID')}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </SuperAdminLayout>
  );
}
