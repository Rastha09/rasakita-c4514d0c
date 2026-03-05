import { useState } from 'react';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Settings, Database, Shield, CreditCard, CheckCircle2, Lock, LogOut, Bell, Info
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ChangePasswordModal } from '@/components/account/ChangePasswordModal';

export default function SuperAdminSettingsPage() {
  const { signOut } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const platformSettings = [
    { title: 'Database', description: 'Status koneksi database', icon: Database, statusLabel: 'Terhubung' },
    { title: 'Autentikasi', description: 'Konfigurasi login dan keamanan', icon: Shield, statusLabel: 'Aktif' },
    { title: 'Payment Gateway', description: 'Integrasi pembayaran QRIS', icon: CreditCard, statusLabel: 'Terkonfigurasi' },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">Pengaturan Platform</h1>
          <p className="text-sm text-muted-foreground">Konfigurasi sistem dan akun</p>
        </div>

        {/* Platform Info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Info className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Roti Online Platform</p>
                <p className="text-sm text-muted-foreground">Versi 1.0.0 • Powered by Lovable Cloud</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform Status */}
        <div className="grid gap-3">
          {platformSettings.map((setting) => (
            <Card key={setting.title}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <setting.icon className="h-5 w-5 text-primary" />
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

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifikasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Notifikasi Sistem</Label>
                <p className="text-sm text-muted-foreground">Terima notifikasi pesanan & user baru</p>
              </div>
              <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
            </div>
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Akun
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={() => setShowPasswordModal(true)}>
              <Lock className="h-4 w-4 mr-2" />
              Ganti Password
            </Button>
            <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Keluar
            </Button>
          </CardContent>
        </Card>
      </div>

      <ChangePasswordModal open={showPasswordModal} onOpenChange={setShowPasswordModal} />
    </SuperAdminLayout>
  );
}