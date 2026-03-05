import { useState } from 'react';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Download, Store, Percent } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format-currency';

type Period = 'today' | 'month' | 'total';
const COMMISSION_RATE = 0.10; // 10%

export default function SuperAdminKeuanganPage() {
  const [period, setPeriod] = useState<Period>('month');

  const { data, isLoading } = useQuery({
    queryKey: ['sa-keuangan', period],
    queryFn: async () => {
      let query = supabase.from('orders').select('*, stores(name)').eq('payment_status', 'PAID');

      if (period === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte('created_at', today.toISOString());
      } else if (period === 'month') {
        const start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        query = query.gte('created_at', start.toISOString());
      }

      const { data: orders } = await query;
      const allOrders = orders || [];

      const totalGMV = allOrders.reduce((sum, o) => sum + o.total, 0);
      const totalCommission = Math.round(totalGMV * COMMISSION_RATE);

      // Per-store breakdown
      const storeMap = new Map<string, { name: string; orders: number; revenue: number; commission: number }>();
      allOrders.forEach(o => {
        const storeName = (o.stores as any)?.name || 'Unknown';
        const existing = storeMap.get(o.store_id) || { name: storeName, orders: 0, revenue: 0, commission: 0 };
        existing.orders += 1;
        existing.revenue += o.total;
        existing.commission += Math.round(o.total * COMMISSION_RATE);
        storeMap.set(o.store_id, existing);
      });

      return {
        totalGMV,
        totalCommission,
        storeBreakdown: Array.from(storeMap.entries()).map(([id, data]) => ({ id, ...data })),
      };
    },
  });

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Keuangan</h1>

        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="today">Hari Ini</TabsTrigger>
            <TabsTrigger value="month">Bulan Ini</TabsTrigger>
            <TabsTrigger value="total">Total</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            {/* GMV Card */}
            <div className="gradient-primary rounded-2xl p-5 text-primary-foreground">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5" />
                <span className="font-medium text-sm opacity-90">Total GMV</span>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(data?.totalGMV || 0)}</p>
            </div>

            {/* Commission Card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Percent className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Komisi Platform (10%)</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(data?.totalCommission || 0)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Per-store breakdown */}
            <div>
              <h2 className="text-lg font-bold mb-3">Per Toko</h2>
              {data?.storeBreakdown.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Store className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Belum ada data transaksi</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {data?.storeBreakdown.map((store) => (
                    <Card key={store.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Store className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">{store.name}</p>
                            <p className="text-sm text-muted-foreground">{store.orders} pesanan</p>
                          </div>
                          <Badge variant={store.orders > 0 ? 'default' : 'outline'} className="text-xs">
                            {store.orders > 0 ? '✅ Lunas' : '🕐 Belum'}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm border-t border-border pt-2 mt-2">
                          <div>
                            <p className="text-muted-foreground">Total Transaksi</p>
                            <p className="font-semibold">{formatCurrency(store.revenue)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-muted-foreground">Komisi</p>
                            <p className="font-semibold text-primary">{formatCurrency(store.commission)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary/5">
              <Download className="h-4 w-4 mr-2" /> Download Laporan
            </Button>
          </>
        )}
      </div>
    </SuperAdminLayout>
  );
}