import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ShoppingBag, TrendingUp, Clock, Package, Store, Loader2 } from 'lucide-react';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useAuth } from '@/lib/auth';
import { formatCurrency, formatDateTime } from '@/lib/format-currency';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function SuperAdminDashboard() {
  const { stats, statsLoading } = useSuperAdmin();
  const { profile } = useAuth();

  // Extra stats
  const { data: extraStats } = useQuery({
    queryKey: ['sa-extra-stats'],
    queryFn: async () => {
      const [storesRes, productsRes] = await Promise.all([
        supabase.from('stores').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('products').select('rating_avg').eq('is_active', true),
      ]);
      const ratings = productsRes.data || [];
      const avgRating = ratings.length > 0
        ? (ratings.reduce((sum, p) => sum + Number(p.rating_avg), 0) / ratings.length).toFixed(1)
        : '0';
      return {
        activeStores: storesRes.count || 0,
        avgRating,
      };
    },
  });

  // Recent activity
  const { data: activity = [] } = useQuery({
    queryKey: ['sa-activity'],
    queryFn: async () => {
      const items: { icon: string; text: string; time: string }[] = [];

      const { data: orders } = await supabase
        .from('orders')
        .select('order_code, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      orders?.forEach(o => {
        items.push({ icon: '🛒', text: `Pesanan baru ${o.order_code}`, time: formatDateTime(o.created_at) });
      });

      const { data: users } = await supabase
        .from('profiles')
        .select('full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(2);

      users?.forEach(u => {
        items.push({ icon: '👤', text: `User baru: ${u.full_name || 'Anonymous'}`, time: formatDateTime(u.created_at) });
      });

      return items.slice(0, 5);
    },
  });

  // Get current month GMV
  const { data: monthGMV = 0 } = useQuery({
    queryKey: ['sa-month-gmv'],
    queryFn: async () => {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from('orders')
        .select('total')
        .eq('payment_status', 'PAID')
        .gte('created_at', start.toISOString());
      return (data || []).reduce((sum, o) => sum + o.total, 0);
    },
  });

  const statCards = [
    { label: 'Total Toko Aktif', value: extraStats?.activeStores || 0, icon: Store, color: 'bg-primary' },
    { label: 'Total User', value: stats?.totalUsers || 0, icon: Users, color: 'bg-blue-500' },
    { label: 'Order Baru', value: stats?.newOrders || 0, icon: ShoppingBag, color: 'bg-primary' },
    { label: 'Diproses', value: stats?.processing || 0, icon: Clock, color: 'bg-amber-500' },
    { label: 'Total Pesanan', value: stats?.totalOrders || 0, icon: Package, color: 'bg-emerald-500' },
    { label: 'GMV Bulan Ini', value: formatCurrency(monthGMV), icon: TrendingUp, color: 'bg-green-500', isText: true },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="gradient-primary rounded-2xl p-5 text-primary-foreground">
          <h1 className="text-xl font-bold">Selamat Datang, {profile?.full_name || 'Admin'}! 👑</h1>
          <p className="text-sm opacity-90 mt-1">Super Admin • Platform Roti Online</p>
        </div>

        {/* Main KPI Cards */}
        {statsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>)}
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

        {/* Recent Activity */}
        <div>
          <h2 className="text-lg font-bold mb-3">Aktivitas Terkini</h2>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {activity.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 text-sm">Belum ada aktivitas</p>
              ) : (
                activity.map((a, i) => (
                  <div key={i} className="px-4 py-3 flex items-center gap-3">
                    <span className="text-lg">{a.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.text}</p>
                      <p className="text-xs text-muted-foreground">{a.time}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
