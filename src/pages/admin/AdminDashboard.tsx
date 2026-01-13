import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ShoppingBag, Users, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const stats = [
    { label: 'Total Produk', value: '5', icon: Package, color: 'bg-primary' },
    { label: 'Pesanan Baru', value: '0', icon: ShoppingBag, color: 'bg-accent' },
    { label: 'Pelanggan', value: '0', icon: Users, color: 'bg-warning' },
    { label: 'Pendapatan', value: 'Rp 0', icon: TrendingUp, color: 'bg-success' },
  ];

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Dashboard Admin</h1>
      
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <div className={`h-10 w-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="h-5 w-5 text-primary-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}
