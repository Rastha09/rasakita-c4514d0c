import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { useAdminStore } from '@/hooks/useAdminStore';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CreditCard, Truck, MapPin, Lock, LogOut } from 'lucide-react';
import { ChangePasswordModal } from '@/components/account/ChangePasswordModal';

export default function AdminSettingsPage() {
  const { settings, isLoading, updateSettings } = useAdminStore();
  const { signOut } = useAuth();
  
  const [codEnabled, setCodEnabled] = useState(true);
  const [qrisEnabled, setQrisEnabled] = useState(false);
  const [courierEnabled, setCourierEnabled] = useState(true);
  const [pickupEnabled, setPickupEnabled] = useState(true);
  const [shippingFee, setShippingFee] = useState(10000);
  const [pickupAddress, setPickupAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (settings) {
      setCodEnabled(settings.payment_cod_enabled);
      setQrisEnabled(settings.payment_qris_enabled);
      setCourierEnabled(settings.shipping_courier_enabled);
      setPickupEnabled(settings.shipping_pickup_enabled);
      setShippingFee(settings.shipping_fee_flat);
      setPickupAddress(settings.pickup_address || '');
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings.mutateAsync({
        payment_cod_enabled: codEnabled,
        payment_qris_enabled: qrisEnabled,
        shipping_courier_enabled: courierEnabled,
        shipping_pickup_enabled: pickupEnabled,
        shipping_fee_flat: shippingFee,
        pickup_address: pickupAddress || null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">Pengaturan</h1>
          <p className="text-sm text-muted-foreground">Atur metode pembayaran, pengiriman, dan akun</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Methods */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Metode Pembayaran
              </CardTitle>
              <CardDescription>Pilih metode pembayaran yang tersedia</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="cod" className="font-medium">COD (Bayar di Tempat)</Label>
                  <p className="text-sm text-muted-foreground">Pelanggan bayar saat menerima pesanan</p>
                </div>
                <Switch id="cod" checked={codEnabled} onCheckedChange={setCodEnabled} />
              </div>
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="qris" className="font-medium">QRIS</Label>
                    <p className="text-sm text-muted-foreground">Pembayaran digital via QRIS</p>
                  </div>
                  <Switch id="qris" checked={qrisEnabled} onCheckedChange={setQrisEnabled} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Methods */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Metode Pengiriman
              </CardTitle>
              <CardDescription>Atur opsi pengiriman dan biaya ongkir</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="courier" className="font-medium">Kurir / Antar</Label>
                  <p className="text-sm text-muted-foreground">Pesanan diantar ke alamat pelanggan</p>
                </div>
                <Switch id="courier" checked={courierEnabled} onCheckedChange={setCourierEnabled} />
              </div>
              {courierEnabled && (
                <div className="pl-4 border-l-2 border-primary/20 space-y-2">
                  <Label htmlFor="shippingFee">Biaya Ongkir (Rp)</Label>
                  <Input id="shippingFee" type="number" value={shippingFee} onChange={(e) => setShippingFee(Number(e.target.value))} min={0} step={1000} />
                </div>
              )}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="pickup" className="font-medium">Ambil di Tempat</Label>
                    <p className="text-sm text-muted-foreground">Pelanggan mengambil pesanan langsung</p>
                  </div>
                  <Switch id="pickup" checked={pickupEnabled} onCheckedChange={setPickupEnabled} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pickup Location */}
          {pickupEnabled && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Lokasi Pengambilan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} placeholder="Alamat lengkap untuk pengambilan pesanan..." rows={3} />
              </CardContent>
            </Card>
          )}

          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Simpan Pengaturan
          </Button>
        </form>

        {/* Account Section */}
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
    </AdminLayout>
  );
}