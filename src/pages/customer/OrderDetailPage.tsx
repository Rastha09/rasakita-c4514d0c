import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Truck, Store, MapPin, Banknote, CheckCircle2, Clock, Package, CircleDot, CreditCard, QrCode } from 'lucide-react';
import { CustomerLayout } from '@/components/layouts/CustomerLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Pesanan Baru',
  CONFIRMED: 'Dikonfirmasi',
  PROCESSING: 'Diproses',
  OUT_FOR_DELIVERY: 'Dalam Pengiriman',
  READY_FOR_PICKUP: 'Siap Diambil',
  COMPLETED: 'Selesai',
  CANCELED: 'Dibatalkan',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-purple-100 text-purple-700',
  PROCESSING: 'bg-yellow-100 text-yellow-700',
  OUT_FOR_DELIVERY: 'bg-orange-100 text-orange-700',
  READY_FOR_PICKUP: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELED: 'bg-red-100 text-red-700',
};

const TIMELINE_COURIER = ['NEW', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'COMPLETED'];
const TIMELINE_PICKUP = ['NEW', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'COMPLETED'];

interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  qty: number;
  notes?: string;
  subtotal: number;
}

interface CustomerAddress {
  name: string;
  phone: string;
  address: string;
}

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  const { data: orderData, isLoading, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('No order ID');
      
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (error) throw error;

      // Fetch store settings for pickup address
      const { data: settings } = await supabase
        .from('store_settings')
        .select('pickup_address')
        .eq('store_id', order.store_id)
        .single();

      // Fetch latest payment if QRIS
      let payment = null;
      if (order.payment_method === 'QRIS') {
        const { data: paymentData } = await supabase
          .from('payments')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        payment = paymentData;
      }

      return { order, settings, payment };
    },
    enabled: !!orderId && !!user,
  });

  // Create invoice mutation for retry
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/duitku-create-invoice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ orderId }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create invoice');
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Invoice pembayaran berhasil dibuat');
      navigate(`/payment/${orderId}`);
    },
    onError: (error) => {
      console.error('Create invoice error:', error);
      toast.error('Gagal membuat invoice pembayaran');
    },
  });

  const handlePayNow = () => {
    const payment = orderData?.payment;
    // Check if there's an active payment
    if (payment && payment.status === 'PENDING' && payment.expired_at && new Date(payment.expired_at) > new Date()) {
      // Use existing payment
      navigate(`/payment/${orderId}`);
    } else {
      // Create new invoice
      createInvoiceMutation.mutate();
    }
  };

  const order = orderData?.order;
  const settings = orderData?.settings;

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CustomerLayout>
    );
  }

  if (!order) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground mb-4">Pesanan tidak ditemukan</p>
          <Button onClick={() => navigate('/orders')}>Kembali ke Pesanan</Button>
        </div>
      </CustomerLayout>
    );
  }

  const items = (order.items as unknown as OrderItem[]) || [];
  const customerAddress = order.customer_address as unknown as CustomerAddress | null;
  const timeline = order.shipping_method === 'COURIER' ? TIMELINE_COURIER : TIMELINE_PICKUP;
  const currentStatusIndex = timeline.indexOf(order.order_status);
  const payment = orderData?.payment;

  // Check if QRIS payment needs action
  const isQrisUnpaid = order.payment_method === 'QRIS' && order.payment_status === 'UNPAID';
  const isQrisExpired = order.payment_method === 'QRIS' && order.payment_status === 'EXPIRED';
  const needsPaymentAction = isQrisUnpaid || isQrisExpired;

  return (
    <CustomerLayout>
      <div className="px-4 py-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigate('/orders')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">{order.order_code}</h1>
            <p className="text-xs text-muted-foreground">
              {format(new Date(order.created_at), 'd MMMM yyyy, HH:mm', { locale: localeId })}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          <Badge className={cn('rounded-full text-sm px-3 py-1', STATUS_COLORS[order.order_status])}>
            {STATUS_LABELS[order.order_status]}
          </Badge>
        </div>

        {/* Timeline */}
        {order.order_status !== 'CANCELED' && (
          <div className="bg-card rounded-2xl p-4 shadow-card mb-4">
            <h2 className="font-semibold mb-4">Status Pesanan</h2>
            <div className="relative">
              {timeline.map((status, index) => {
                const isCompleted = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;

                return (
                  <div key={status} className="flex items-start gap-3 pb-4 last:pb-0">
                    <div className="relative flex flex-col items-center">
                      {isCompleted ? (
                        <CheckCircle2 className={cn('h-5 w-5', isCurrent ? 'text-primary' : 'text-primary/60')} />
                      ) : (
                        <CircleDot className="h-5 w-5 text-muted-foreground/40" />
                      )}
                      {index < timeline.length - 1 && (
                        <div className={cn(
                          'w-0.5 h-6 mt-1',
                          index < currentStatusIndex ? 'bg-primary/60' : 'bg-muted-foreground/20'
                        )} />
                      )}
                    </div>
                    <div className="flex-1 -mt-0.5">
                      <p className={cn(
                        'text-sm font-medium',
                        isCompleted ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {STATUS_LABELS[status]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Shipping Info */}
        <div className="bg-card rounded-2xl p-4 shadow-card mb-4">
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            {order.shipping_method === 'COURIER' ? (
              <>
                <Truck className="h-4 w-4" /> Pengiriman Kurir
              </>
            ) : (
              <>
                <Store className="h-4 w-4" /> Ambil di Tempat
              </>
            )}
          </h2>
          {order.shipping_method === 'COURIER' && customerAddress ? (
            <div className="space-y-1 text-sm">
              <p className="font-medium">{customerAddress.name}</p>
              <p className="text-muted-foreground">{customerAddress.phone}</p>
              <p className="text-muted-foreground">{customerAddress.address}</p>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="text-muted-foreground">
                {settings?.pickup_address || 'Alamat pengambilan akan dikonfirmasi'}
              </p>
            </div>
          )}
        </div>

        {/* Payment Info */}
        <div className="bg-card rounded-2xl p-4 shadow-card mb-4">
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <Banknote className="h-4 w-4" /> Pembayaran
          </h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Metode</span>
            <span className="text-sm font-medium">
              {order.payment_method === 'COD' ? 'COD (Bayar di Tempat)' : 'QRIS'}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={order.payment_status === 'PAID' ? 'default' : 'secondary'} className="rounded-full">
              {order.payment_status === 'PAID' ? 'Lunas' : 'Belum Bayar'}
            </Badge>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-card rounded-2xl p-4 shadow-card mb-4">
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <Package className="h-4 w-4" /> Detail Pesanan
          </h2>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-muted-foreground">
                    {item.qty} x Rp {item.price.toLocaleString('id-ID')}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-muted-foreground italic">"{item.notes}"</p>
                  )}
                </div>
                <p className="font-medium">Rp {item.subtotal.toLocaleString('id-ID')}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="bg-card rounded-2xl p-4 shadow-card mb-4">
            <h2 className="font-semibold mb-2">Catatan</h2>
            <p className="text-sm text-muted-foreground">{order.notes}</p>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-card rounded-2xl p-4 shadow-card">
          <h2 className="font-semibold mb-3">Ringkasan Biaya</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>Rp {order.subtotal.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ongkir</span>
              <span>
                {order.shipping_fee === 0 ? 'Gratis' : `Rp ${order.shipping_fee.toLocaleString('id-ID')}`}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-primary">
                Rp {order.total.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Payment Action for QRIS */}
      {needsPaymentAction && (
        <div className="fixed bottom-16 left-0 right-0 bg-background border-t border-border p-4 safe-bottom z-40">
          <Button
            className="w-full h-12 rounded-full text-base font-semibold"
            onClick={handlePayNow}
            disabled={createInvoiceMutation.isPending}
          >
            {createInvoiceMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Memproses...
              </>
            ) : isQrisExpired ? (
              'Buat Pembayaran Baru'
            ) : (
              'Bayar Sekarang'
            )}
          </Button>
        </div>
      )}
    </CustomerLayout>
  );
}
