import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Database, 
  Shield, 
  CreditCard,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';

export default function SuperAdminSettingsPage() {
  const platformSettings = [
    {
      title: 'Database',
      description: 'Status koneksi database dan statistik',
      icon: Database,
      status: 'connected',
      statusLabel: 'Terhubung',
    },
    {
      title: 'Autentikasi',
      description: 'Konfigurasi login dan keamanan pengguna',
      icon: Shield,
      status: 'active',
      statusLabel: 'Aktif',
    },
    {
      title: 'Payment Gateway',
      description: 'Integrasi Duitku untuk pembayaran QRIS',
      icon: CreditCard,
      status: 'configured',
      statusLabel: 'Terkonfigurasi',
    },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">Pengaturan Platform</h1>
          <p className="text-sm text-muted-foreground">Konfigurasi sistem dan integrasi</p>
        </div>

        {/* Platform Status */}
        <div className="grid gap-4">
          {platformSettings.map((setting) => (
            <Card key={setting.title}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <setting.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{setting.title}</h3>
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                  </div>
                </div>
                <Badge variant="outline" className="gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  {setting.statusLabel}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Akses Cepat
            </CardTitle>
            <CardDescription>
              Link ke pengaturan dan debug tools
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-between" asChild>
              <a href="/admin/settings/payments-debug" target="_blank" rel="noopener noreferrer">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Debug Tools
                </span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Mode Super Admin</h4>
                <p className="text-sm text-muted-foreground">
                  Anda memiliki akses penuh ke semua fitur platform. Gunakan dengan bijak dan pastikan untuk selalu menjaga keamanan akun Anda.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
