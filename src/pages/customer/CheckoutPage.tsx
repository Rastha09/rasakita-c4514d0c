import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MapPin, Clock, Truck, Store, CreditCard, Banknote, Loader2 } from 'lucide-react';
import { CustomerLayout } from '@/components/layouts/CustomerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCart } from '@/lib/cart';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ShippingMethod = 'COURIER' | 'PICKUP';
type PaymentMethod = 'COD' | 'QRIS';

interface AddressForm {
  name: string;
  phone: string;
  address: string;
  notes: string;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const { user, session } = useAuth();

  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('COURIER');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [addressForm, setAddressForm] = useState<AddressForm>({
    name: '',
    phone: '',
    address: '',
    notes: '',
  });

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items, navigate]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      toast.error('Silakan login terlebih dahulu');
      navigate('/login', { state: { from: '/checkout' } });
    }
  }, [user, navigate]);

  // Fetch store and settings
  const { data: storeData } = useQuery({
    queryKey: ['store-checkout'],
    queryFn: async () => {
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (storeError) throw storeError;

      const { data: settings, error: settingsError } = await supabase
        .from('store_settings')
        .select('*')
        .eq('store_id', store.id)
        .single();

      if (settingsError) throw settingsError;

      return { store, settings };
    },
  });

  const store = storeData?.store;
  const settings = storeData?.settings;

  const shippingFee = shippingMethod === 'COURIER' ? (settings?.shipping_fee_flat || 10000) : 0;
  const total = subtotal + shippingFee;

  // COD order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!store || !user) throw new Error('Missing data');

      const orderItems = items.map((item) => ({
        product_id: item.product_id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        notes: item.notes || null,
        subtotal: item.price * item.qty,
      }));

      const customerAddress = shippingMethod === 'COURIER' ? {
        name: addressForm.name,
        phone: addressForm.phone,
        address: addressForm.address,
      } : null;

      // Generate order code
      const { data: orderCode, error: codeError } = await supabase.rpc('generate_order_code');
      if (codeError) throw codeError;

      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          store_id: store.id,
          customer_id: user.id,
          order_code: orderCode,
          items: orderItems,
          subtotal,
          shipping_fee: shippingFee,
          total,
          shipping_method: shippingMethod,
          payment_method: paymentMethod,
          payment_status: 'UNPAID',
          order_status: 'NEW',
          customer_address: customerAddress,
          notes: addressForm.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return order;
    },
    onSuccess: (order) => {
      clearCart();
      toast.success('Pesanan berhasil dibuat!');
      navigate(`/orders/${order.id}`);
    },
    onError: (error) => {
      console.error('Order error:', error);
      toast.error('Gagal membuat pesanan. Silakan coba lagi.');
    },
  });

  // QRIS order mutation - creates order then redirects to payment
  const createQrisOrderMutation = useMutation({
    mutationFn: async () => {
      if (!store || !user || !session?.access_token) throw new Error('Missing data');

      const orderItems = items.map((item) => ({
        product_id: item.product_id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        notes: item.notes || null,
        subtotal: item.price * item.qty,
      }));

      const customerAddress = shippingMethod === 'COURIER' ? {
        name: addressForm.name,
        phone: addressForm.phone,
        address: addressForm.address,
      } : null;

      // Generate order code
      const { data: orderCode, error: codeError } = await supabase.rpc('generate_order_code');
      if (codeError) throw codeError;

      // Create order with QRIS payment method
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          store_id: store.id,
          customer_id: user.id,
          order_code: orderCode,
          items: orderItems,
          subtotal,
          shipping_fee: shippingFee,
          total,
          shipping_method: shippingMethod,
          payment_method: 'QRIS',
          payment_status: 'UNPAID',
          order_status: 'NEW',
          customer_address: customerAddress,
          notes: addressForm.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Create Duitku invoice
      const invoiceResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/duitku-create-invoice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ orderId: order.id }),
        }
      );

      const invoiceResult = await invoiceResponse.json();
      if (!invoiceResponse.ok) {
        throw new Error(invoiceResult.error || 'Failed to create invoice');
      }

      return order;
    },
    onSuccess: (order) => {
      clearCart();
      toast.success('Pesanan berhasil dibuat! Silakan lakukan pembayaran.');
      navigate(`/payment/${order.id}`);
    },
    onError: (error) => {
      console.error('QRIS Order error:', error);
      toast.error('Gagal membuat pesanan. Silakan coba lagi.');
    },
  });

  const handleSubmit = () => {
    if (shippingMethod === 'COURIER') {
      if (!addressForm.name || !addressForm.phone || !addressForm.address) {
        toast.error('Lengkapi data pengiriman');
        return;
      }
    }

    if (paymentMethod === 'QRIS') {
      createQrisOrderMutation.mutate();
    } else {
      createOrderMutation.mutate();
    }
  };

  const isLoading = createOrderMutation.isPending || createQrisOrderMutation.isPending;

  if (!store || !settings) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="px-4 py-4 pb-40">
        <h1 className="text-xl font-bold mb-4">Checkout</h1>

        {/* Shipping Method */}
        <div className="mb-6">
          <h2 className="font-semibold mb-3">Metode Pengiriman</h2>
          <div className="grid grid-cols-2 gap-3">
            {settings.shipping_courier_enabled && (
              <button
                className={cn(
                  'flex flex-col items-center p-4 rounded-2xl border-2 transition-colors',
                  shippingMethod === 'COURIER'
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card'
                )}
                onClick={() => setShippingMethod('COURIER')}
              >
                <Truck className={cn('h-6 w-6 mb-2', shippingMethod === 'COURIER' ? 'text-primary' : 'text-muted-foreground')} />
                <span className="text-sm font-medium">Kurir Toko</span>
                <span className="text-xs text-muted-foreground">
                  Rp {settings.shipping_fee_flat.toLocaleString('id-ID')}
                </span>
              </button>
            )}
            {settings.shipping_pickup_enabled && (
              <button
                className={cn(
                  'flex flex-col items-center p-4 rounded-2xl border-2 transition-colors',
                  shippingMethod === 'PICKUP'
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card'
                )}
                onClick={() => setShippingMethod('PICKUP')}
              >
                <Store className={cn('h-6 w-6 mb-2', shippingMethod === 'PICKUP' ? 'text-primary' : 'text-muted-foreground')} />
                <span className="text-sm font-medium">Ambil di Tempat</span>
                <span className="text-xs text-muted-foreground">Gratis</span>
              </button>
            )}
          </div>
        </div>

        {/* Address Form (for COURIER) */}
        {shippingMethod === 'COURIER' && (
          <div className="mb-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Alamat Pengiriman
            </h2>
            <div>
              <Label htmlFor="name">Nama Penerima</Label>
              <Input
                id="name"
                value={addressForm.name}
                onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                placeholder="Nama lengkap"
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="phone">No. Telepon</Label>
              <Input
                id="phone"
                type="tel"
                value={addressForm.phone}
                onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                placeholder="08xxxxxxxxxx"
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="address">Alamat Lengkap</Label>
              <Textarea
                id="address"
                value={addressForm.address}
                onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                placeholder="Jalan, RT/RW, Kelurahan, Kecamatan, Kota"
                className="mt-1 rounded-xl min-h-[80px]"
              />
            </div>
          </div>
        )}

        {/* Pickup Info (for PICKUP) */}
        {shippingMethod === 'PICKUP' && (
          <div className="mb-6 bg-muted/50 rounded-2xl p-4">
            <h2 className="font-semibold flex items-center gap-2 mb-2">
              <Store className="h-4 w-4" /> Lokasi Pengambilan
            </h2>
            <p className="text-sm text-muted-foreground mb-2">
              {settings.pickup_address || store.address || 'Alamat toko akan dikonfirmasi'}
            </p>
            {settings.open_hours && Object.keys(settings.open_hours).length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Lihat jam operasional di detail toko</span>
              </div>
            )}
          </div>
        )}

        {/* Payment Method */}
        <div className="mb-6">
          <h2 className="font-semibold mb-3">Metode Pembayaran</h2>
          <div className="grid grid-cols-2 gap-3">
            {settings.payment_cod_enabled && (
              <button
                className={cn(
                  'flex flex-col items-center p-4 rounded-2xl border-2 transition-colors',
                  paymentMethod === 'COD'
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card'
                )}
                onClick={() => setPaymentMethod('COD')}
              >
                <Banknote className={cn('h-6 w-6 mb-2', paymentMethod === 'COD' ? 'text-primary' : 'text-muted-foreground')} />
                <span className="text-sm font-medium">COD</span>
                <span className="text-xs text-muted-foreground">Bayar di Tempat</span>
              </button>
            )}
            {settings.payment_qris_enabled ? (
              <button
                className={cn(
                  'flex flex-col items-center p-4 rounded-2xl border-2 transition-colors',
                  paymentMethod === 'QRIS'
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card'
                )}
                onClick={() => setPaymentMethod('QRIS')}
              >
                <CreditCard className={cn('h-6 w-6 mb-2', paymentMethod === 'QRIS' ? 'text-primary' : 'text-muted-foreground')} />
                <span className="text-sm font-medium">QRIS</span>
                <span className="text-xs text-muted-foreground">Scan & Bayar</span>
              </button>
            ) : (
              <button
                className={cn(
                  'flex flex-col items-center p-4 rounded-2xl border-2 transition-colors opacity-50 cursor-not-allowed',
                  'border-border bg-card'
                )}
                disabled
              >
                <CreditCard className="h-6 w-6 mb-2 text-muted-foreground" />
                <span className="text-sm font-medium">QRIS</span>
                <span className="text-xs text-muted-foreground">Tidak Tersedia</span>
              </button>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <Label htmlFor="notes">Catatan Pesanan (opsional)</Label>
          <Textarea
            id="notes"
            value={addressForm.notes}
            onChange={(e) => setAddressForm({ ...addressForm, notes: e.target.value })}
            placeholder="Catatan tambahan untuk pesanan Anda..."
            className="mt-1 rounded-xl"
          />
        </div>

        {/* Order Summary */}
        <div className="bg-card rounded-2xl p-4 shadow-card mb-4">
          <h2 className="font-semibold mb-3">Ringkasan Pesanan</h2>
          <div className="space-y-2 text-sm">
            {items.map((item) => (
              <div key={item.product_id} className="flex justify-between">
                <span className="text-muted-foreground">
                  {item.name} x{item.qty}
                </span>
                <span>Rp {(item.price * item.qty).toLocaleString('id-ID')}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ongkir</span>
                <span>{shippingFee === 0 ? 'Gratis' : `Rp ${shippingFee.toLocaleString('id-ID')}`}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom */}
      <div className="fixed bottom-16 left-0 right-0 bg-background border-t border-border p-4 safe-bottom z-40">
        <div className="flex items-center justify-between mb-3">
          <span className="text-muted-foreground">Total</span>
          <span className="text-xl font-bold text-primary">
            Rp {total.toLocaleString('id-ID')}
          </span>
        </div>
        <Button
          className="w-full h-12 rounded-full text-base font-semibold"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Memproses...
            </>
          ) : (
            'Buat Pesanan'
          )}
        </Button>
      </div>
    </CustomerLayout>
  );
}
