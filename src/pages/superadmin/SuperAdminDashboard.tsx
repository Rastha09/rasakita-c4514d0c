import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, Users, ShoppingBag, TrendingUp } from 'lucide-react';

export default function SuperAdminDashboard() {
  const stats = [
    { label: 'Total Toko', value: '1', icon: Store, color: 'bg-primary' },
    { label: 'Total User', value: '0', icon: Users, color: 'bg-accent' },
    { label: 'Total Pesanan', value: '0', icon: ShoppingBag, color: 'bg-warning' },
    { label: 'GMV', value: 'Rp 0', icon: TrendingUp, color: 'bg-success' },
  ];

  return (
    <SuperAdminLayout>
      <h1 className="text-2xl font-bold mb-6">Dashboard Super Admin</h1>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
    </SuperAdminLayout>
  );
}
