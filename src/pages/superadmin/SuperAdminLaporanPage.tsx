import { useState } from 'react';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format-currency';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type Period = '7days' | '30days';

export default function SuperAdminLaporanPage() {
  const [period, setPeriod] = useState<Period>('7days');

  const { data, isLoading } = useQuery({
    queryKey: ['sa-laporan', period],
    queryFn: async () => {
      const days = period === '7days' ? 7 : 30;
      const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const { data: orders } = await supabase
        .from('orders')
        .select('*, stores(name)')
        .gte('created_at', start.toISOString());

      const allOrders = orders || [];
      const completed = allOrders.filter(o => o.order_status === 'COMPLETED' || o.payment_status === 'PAID');

      // Daily chart
      const dailyMap = new Map<string, { revenue: number; count: number }>();
      completed.forEach(o => {
        const day = new Date(o.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const existing = dailyMap.get(day) || { revenue: 0, count: 0 };
        existing.revenue += o.total;
        existing.count += 1;
        dailyMap.set(day, existing);
      });
      const chartData = Array.from(dailyMap.entries()).map(([name, d]) => ({ name, revenue: d.revenue, orders: d.count }));

      // Stats
      const totalRevenue = completed.reduce((sum, o) => sum + o.total, 0);
      const avgOrderValue = completed.length > 0 ? Math.round(totalRevenue / completed.length) : 0;
      const conversionRate = allOrders.length > 0 ? ((completed.length / allOrders.length) * 100).toFixed(1) : '0';

      // Peak hour
      const hourCounts = new Map<number, number>();
      allOrders.forEach(o => {
        const hour = new Date(o.created_at).getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      });
      let peakHour = '—';
      if (hourCounts.size > 0) {
        const sorted = [...hourCounts.entries()].sort((a, b) => b[1] - a[1]);
        const h = sorted[0][0];
        peakHour = `${h.toString().padStart(2, '0')}:00 - ${(h + 2).toString().padStart(2, '0')}:00`;
      }

      // Top stores
      const storeMap = new Map<string, { name: string; revenue: number; orders: number }>();
      completed.forEach(o => {
        const storeName = (o.stores as any)?.name || 'Unknown';
        const existing = storeMap.get(o.store_id) || { name: storeName, revenue: 0, orders: 0 };
        existing.revenue += o.total;
        existing.orders += 1;
        storeMap.set(o.store_id, existing);
      });
      const topStores = Array.from(storeMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      return { chartData, totalRevenue, avgOrderValue, conversionRate, peakHour, topStores, totalOrders: allOrders.length };
    },
  });

  const medals = ['🥇', '🥈', '🥉'];

  const formatYAxis = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(0)}jt`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`;
    return val.toString();
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Laporan Platform</h1>

        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="7days">7 Hari</TabsTrigger>
            <TabsTrigger value="30days">30 Hari</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : (
          <>
            {/* Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tren Pendapatan</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.chartData && data.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={data.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(val: number, name: string) => [name === 'revenue' ? formatCurrency(val) : val, name === 'revenue' ? 'Pendapatan' : 'Pesanan']} />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(16, 85%, 60%)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Belum ada data</p>
                )}
              </CardContent>
            </Card>

            {/* Platform Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold text-primary">{data?.conversionRate}%</p>
                  <p className="text-xs text-muted-foreground">Conversion Rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold">{formatCurrency(data?.avgOrderValue || 0)}</p>
                  <p className="text-xs text-muted-foreground">Rata-rata Order</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm font-bold">{data?.peakHour || '—'}</p>
                  <p className="text-xs text-muted-foreground">Jam Sibuk</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold">{data?.totalOrders || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Pesanan</p>
                </CardContent>
              </Card>
            </div>

            {/* Top Stores */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Toko Terbaik</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data?.topStores && data.topStores.length > 0 ? (
                  data.topStores.map((store, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${i < 3 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {i < 3 ? medals[i] : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{store.name}</p>
                        <p className="text-xs text-muted-foreground">{store.orders} pesanan</p>
                      </div>
                      <p className="text-sm font-semibold text-primary">{formatCurrency(store.revenue)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">Belum ada data</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </SuperAdminLayout>
  );
}